import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { PipelinePrompt } from "@/shared/ipc/studio"
import {
  useCanvasContainer,
  useCanvasContextMenu,
  useCanvasDisplay,
  useCanvasPan,
  useCanvasSelection,
  useCanvasTool,
  useCanvasZoom,
} from "@/features/studio/canvas-state/canvas-context"
import { listenToStudioEvents } from "@/shared/ipc/events"
import { services } from "@/shared/services"
import type { Annotation, Item, Label, Project } from "@/shared/types/core"
import { openPathDialog } from "@/shared/lib/desktop"
import { simplifyPolyline } from "@/features/studio/model/lib/canvas-utils"
import { exportDataset, type ExportFormat } from "@/features/studio/model/lib/export"
import { useItemLabelerViewModel } from "@/features/studio/model/image-labeler-viewmodel"
import { useSettingsViewModel } from "@/shared/model/settings-viewmodel"
import { useCanvasSession } from "./use-canvas-session"
import type { StudioHeaderStats } from "./types"

export function useStudioScreenViewModel(projectId?: string, itemId?: string) {
  const navigate = useNavigate()
  const imageLabeler = useItemLabelerViewModel(projectId, itemId)
  const settings = useSettingsViewModel()
  const { contextMenu, setContextMenu } = useCanvasContextMenu()
  const { container, setContainer } = useCanvasContainer()
  const { selectedAnnotation, setSelectedAnnotation } = useCanvasSelection()
  const { selectedTool, setSelectedTool } = useCanvasTool()
  const { zoom, zoomIn, zoomOut } = useCanvasZoom()
  const { resetView } = useCanvasPan()
  const {
    showCrosshair,
    showCoordinates,
    showRuler,
    setShowCrosshair,
    setShowCoordinates,
    toggleRuler,
  } = useCanvasDisplay()

  const [project, setProject] = useState<Project | null>(null)
  // The file panel loads items incrementally (one page at a time) so a project
  // with thousands of items never loads them all up front. `projectItems` is the
  // accumulated, loaded-so-far list.
  const [projectItems, setProjectImages] = useState<Item[]>([])
  const [itemsTotal, setItemsTotal] = useState(0)
  const [itemSearchDraft, setItemSearchDraft] = useState("")
  const [itemSearch, setItemSearch] = useState("")
  const [isItemsLoading, setIsItemsLoading] = useState(true)
  const [annotatedItemIds, setAnnotatedImageIds] = useState<Set<string>>(
    new Set()
  )
  const [projectStats, setProjectStats] = useState<StudioHeaderStats>({
    totalItems: 0,
    labeledItems: 0,
    totalLabels: 0,
  })
  const [isProjectSummaryLoading, setIsProjectSummaryLoading] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // Active class: the label new shapes inherit (set via the palette or 1–9).
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null)

  const effectiveProjectId = useMemo(
    () =>
      projectId ||
      imageLabeler.image?.projectId ||
      imageLabeler.image?.project_id ||
      "",
    [imageLabeler.image?.projectId, imageLabeler.image?.project_id, projectId]
  )

  const activeLabel = useMemo(
    () => imageLabeler.labels.find((entry) => entry.id === activeLabelId) ?? null,
    [imageLabeler.labels, activeLabelId]
  )

  const canvasSession = useCanvasSession({
    annotations: imageLabeler.annotations,
    selectedAnnotation,
    setSelectedAnnotation,
    createAnnotation: imageLabeler.createAnnotation,
    createAnnotationFromDraft: imageLabeler.createAnnotationFromDraft,
    updateAnnotation: imageLabeler.updateAnnotation,
    deleteAnnotation: imageLabeler.deleteAnnotation,
  })

  useEffect(() => {
    setShowCrosshair(settings.showCrosshairs)
  }, [setShowCrosshair, settings.showCrosshairs])

  useEffect(() => {
    setShowCoordinates(settings.showCoordinates)
  }, [setShowCoordinates, settings.showCoordinates])

  // `silent` skips the loading-flag flip so an event-driven refresh (after a
  // save/approve) updates stats and the file panel in place, instead of flashing
  // the header and file list through their loading states.
  const refreshProjectSummary = useCallback(async (options?: { silent?: boolean }) => {
    if (!effectiveProjectId) {
      setProject(null)
      setProjectStats({
        totalItems: 0,
        labeledItems: 0,
        totalLabels: 0,
      })
      setIsProjectSummaryLoading(false)
      return
    }

    const silent = options?.silent ?? false
    if (!silent) setIsProjectSummaryLoading(true)

    try {
      // Items are loaded incrementally (below); here we only need the project +
      // labels + annotations for the header stats and the file panel's Done/Todo
      // markers. `totalItems` comes from the project's derived count, not a full
      // item load.
      const [nextProject, annotations, labels] = await Promise.all([
        services.getProjectService().getById(effectiveProjectId),
        services.getAnnotationService().getAnnotationsByProjectId(effectiveProjectId),
        services.getLabelService().getLabelsByProjectId(effectiveProjectId),
      ])

      const labeledItems = new Set(
        annotations
          .map((annotation) => annotation.itemId || annotation.item_id || "")
          .filter(Boolean)
      )

      setProject(nextProject)
      setAnnotatedImageIds(labeledItems)
      setProjectStats({
        totalItems: nextProject?.itemCount ?? 0,
        labeledItems: labeledItems.size,
        totalLabels: labels.length,
      })
    } finally {
      if (!silent) setIsProjectSummaryLoading(false)
    }
  }, [effectiveProjectId])

  // Load one page of items, replacing (reset) or appending (load more). Real SQL
  // LIMIT/OFFSET + search — the whole project is never loaded at once.
  const ITEMS_PAGE_SIZE = 50
  const loadItemsPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (!effectiveProjectId) return
      setIsItemsLoading(true)
      try {
        const { items, total } = await services.getItemService().getItemPage({
          projectId: effectiveProjectId,
          offset,
          limit: ITEMS_PAGE_SIZE,
          search: itemSearch || undefined,
        })
        setItemsTotal(total)
        setProjectImages((current) =>
          replace ? items : [...current, ...items]
        )
      } finally {
        setIsItemsLoading(false)
      }
    },
    [effectiveProjectId, itemSearch]
  )

  // Reset to the first page on project / search change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional load-on-change
    void loadItemsPage(0, true)
  }, [loadItemsPage])

  // Debounce the file-panel search box into the server-side query.
  useEffect(() => {
    const handle = setTimeout(() => setItemSearch(itemSearchDraft.trim()), 300)
    return () => clearTimeout(handle)
  }, [itemSearchDraft])

  const hasMoreItems = projectItems.length < itemsTotal
  const loadMoreItems = useCallback(() => {
    if (!isItemsLoading && projectItems.length < itemsTotal) {
      void loadItemsPage(projectItems.length, false)
    }
  }, [isItemsLoading, projectItems.length, itemsTotal, loadItemsPage])

  useEffect(() => {
    void refreshProjectSummary()
  }, [refreshProjectSummary])

  useEffect(() => {
    if (!effectiveProjectId) return

    let unlisten: (() => void) | undefined

    void listenToStudioEvents(
      (event) => {
        const eventProjectId = event.projectId || event.project_id || ""
        const matchesProject =
          !eventProjectId || eventProjectId === effectiveProjectId

        if (matchesProject) {
          void refreshProjectSummary({ silent: true })
          // Only re-pull the item list when items themselves change (add/delete)
          // — not on every annotation save, which would reset the file panel.
          if (event.entity === "items") void loadItemsPage(0, true)
        }
      },
      ["projects", "items", "annotations", "labels"]
    ).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [effectiveProjectId, refreshProjectSummary, loadItemsPage])

  const navigateToItem = useCallback(
    (nextImageId: string | null | undefined) => {
      if (!effectiveProjectId || !nextImageId) return
      navigate(`/projects/${effectiveProjectId}/studio/${nextImageId}`)
    },
    [effectiveProjectId, navigate]
  )

  // Derive prev/next from the project's image list + the current image id —
  // the SAME list the file panel renders — so the header navigation can never
  // drift out of sync with what's actually loaded.
  const currentItemIndex = useMemo(
    () => projectItems.findIndex((entry) => entry.id === itemId),
    [projectItems, itemId]
  )
  const previousImageId =
    currentItemIndex > 0
      ? projectItems[currentItemIndex - 1]?.id ?? null
      : null
  const nextImageId =
    currentItemIndex >= 0 && currentItemIndex < projectItems.length - 1
      ? projectItems[currentItemIndex + 1]?.id ?? null
      : null

  const goToNextItem = useCallback(() => {
    if (nextImageId) {
      navigateToItem(nextImageId)
    } else if (hasMoreItems) {
      // At the end of the loaded set but more exist — fetch the next page so the
      // following click (or the file panel) can advance into it.
      loadMoreItems()
    }
  }, [nextImageId, navigateToItem, hasMoreItems, loadMoreItems])

  const goToPreviousItem = useCallback(() => {
    navigateToItem(previousImageId)
  }, [previousImageId, navigateToItem])

  // Image navigation (arrows) + class hotkeys (1–9) are handled by a single
  // `useLabelHotkeys` listener mounted in the labeler, replacing the previously
  // separate per-concern keydown handlers.

  const closeContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      items: [],
    })
  }, [setContextMenu])

  const openContextMenu = useCallback(
    (position: { x: number; y: number }) => {
      setContextMenu({
        visible: true,
        x: position.x,
        y: position.y,
        items: [],
      })
    },
    [setContextMenu]
  )

  const acceptPrediction = useCallback(
    async (predictionId: string, labelId?: string) => {
      const createdAnnotation = await imageLabeler.acceptPrediction(
        predictionId,
        labelId
      )
      canvasSession.recordExternalCreate(createdAnnotation, `Accept ${createdAnnotation.name}`)
      setSelectedAnnotation(createdAnnotation)
      return createdAnnotation
    },
    [canvasSession, imageLabeler, setSelectedAnnotation]
  )

  // Smart-segment tool: run SAM and translate the outcome into user feedback.
  // Polygons land in the existing PredictionReviewPanel for accept/reject.
  const smartSegment = useCallback(
    async (prompt: PipelinePrompt) => {
      const outcome = await imageLabeler.smartSegment(prompt)
      if (outcome.status === "no-model") {
        toast.error("No segmentation model installed", {
          description:
            "Install “Segment Anything (SAM)” on the AI Models page to use click-to-segment.",
          action: {
            label: "Open AI Models",
            onClick: () => navigate("/ai-models"),
          },
        })
      } else if (outcome.status === "error") {
        toast.error("Segmentation failed", { description: outcome.message })
      } else if (outcome.count === 0) {
        toast.info("SAM didn’t find a region here", {
          description:
            "Try clicking nearer the center of the object, or drag a box around it.",
        })
      }
    },
    [imageLabeler, navigate]
  )

  // Reduce a vertex-dense polygon / free-draw shape (typically a SAM mask) to a
  // handful of meaningful vertices so it's actually editable by hand. One commit
  // → one undo step; epsilon scales with the shape's size so it behaves the same
  // at any image resolution.
  const canSimplifySelected =
    selectedAnnotation?.type === "polygon" ||
    selectedAnnotation?.type === "freeDraw"

  const simplifySelectedAnnotation = useCallback(async () => {
    const annotation = selectedAnnotation
    if (
      !annotation ||
      (annotation.type !== "polygon" && annotation.type !== "freeDraw")
    ) {
      return
    }

    const points = annotation.coordinates
    const minPoints = annotation.type === "polygon" ? 3 : 2
    if (points.length <= minPoints) {
      toast.info("This shape is already minimal.")
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const point of points) {
      if (point.x < minX) minX = point.x
      if (point.x > maxX) maxX = point.x
      if (point.y < minY) minY = point.y
      if (point.y > maxY) maxY = point.y
    }
    const diagonal = Math.hypot(maxX - minX, maxY - minY)
    const epsilon = Math.max(diagonal * 0.004, 0.75)

    const simplified = simplifyPolyline(points, epsilon)
    if (simplified.length < minPoints || simplified.length >= points.length) {
      toast.info("Nothing to simplify on this shape.")
      return
    }

    await canvasSession.updateAnnotation(annotation.id, {
      coordinates: simplified,
    })
    toast.success(
      `Simplified ${points.length} → ${simplified.length} points.`
    )
  }, [selectedAnnotation, canvasSession])

  const toggleCrosshair = useCallback(async () => {
    const nextValue = !showCrosshair
    setShowCrosshair(nextValue)

    try {
      await settings.updateCrosshairs(nextValue)
    } catch (error) {
      console.error("Failed to update crosshair setting:", error)
      setShowCrosshair(showCrosshair)
    }
  }, [setShowCrosshair, settings, showCrosshair])

  const toggleCoordinates = useCallback(async () => {
    const nextValue = !showCoordinates
    setShowCoordinates(nextValue)

    try {
      await settings.updateCoordinates(nextValue)
    } catch (error) {
      console.error("Failed to update coordinate setting:", error)
      setShowCoordinates(showCoordinates)
    }
  }, [setShowCoordinates, settings, showCoordinates])

  // Export the whole project to a chosen folder in the requested format.
  // Returns { count, outputDir } on success, or null if cancelled.
  const exportProject = useCallback(
    async (format: ExportFormat) => {
      if (!effectiveProjectId) return null

      const [outputDir] = await openPathDialog({ directory: true })
      if (!outputDir) return null

      setIsExporting(true)
      try {
        const [images, annotations, labels] = await Promise.all([
          services.getItemService().getItemsByProjectId(effectiveProjectId),
          services
            .getAnnotationService()
            .getAnnotationsByProjectId(effectiveProjectId),
          services.getLabelService().getLabelsByProjectId(effectiveProjectId),
        ])

        const annotationsByImage = new Map<string, Annotation[]>()
        for (const annotation of annotations) {
          const id = annotation.itemId || annotation.item_id || ""
          const list = annotationsByImage.get(id)
          if (list) list.push(annotation)
          else annotationsByImage.set(id, [annotation])
        }

        const count = await exportDataset(
          format,
          { images, annotationsByImage, labels: labels as Label[] },
          outputDir
        )
        return { count, outputDir }
      } finally {
        setIsExporting(false)
      }
    },
    [effectiveProjectId]
  )

  return {
    data: {
      item: imageLabeler.image,
      annotations: imageLabeler.annotations,
      predictions: imageLabeler.predictions,
      labels: imageLabeler.labels,
      aiModels: imageLabeler.aiModels,
      isLoading: imageLabeler.isLoading,
      error: imageLabeler.error,
    },
    project,
    projectStats,
    isProjectSummaryLoading,
    effectiveProjectId,
    selectedAnnotation,
    setSelectedAnnotation,
    selectedTool,
    activeLabelId,
    activeLabel,
    setActiveLabelId,
    zoom,
    showCrosshair,
    showCoordinates,
    showRuler,
    contextMenu,
    container,
    canUndo: canvasSession.canUndo,
    canRedo: canvasSession.canRedo,
    historyPast: canvasSession.historyPast,
    isGeneratingPredictions: imageLabeler.isGeneratingPredictions,
    isSegmenting: imageLabeler.isSegmenting,
    hasNext: nextImageId !== null,
    hasPrevious: previousImageId !== null,
    nextId: nextImageId,
    prevId: previousImageId,
    currentItemIndex,
    showSettingsModal,
    setContainer,
    setSelectedTool,
    zoomIn,
    zoomOut,
    resetView,
    toggleCrosshair,
    toggleCoordinates,
    toggleRuler,
    openContextMenu,
    closeContextMenu,
    openSettingsModal: () => setShowSettingsModal(true),
    closeSettingsModal: () => setShowSettingsModal(false),
    refreshProjectSummary,
    refreshAnnotations: imageLabeler.refreshAnnotations,
    createAnnotationFromDraft: canvasSession.createAnnotationFromDraft,
    updateAnnotation: canvasSession.updateAnnotation,
    deleteAnnotation: canvasSession.deleteAnnotation,
    canSimplifySelected,
    simplifySelectedAnnotation,
    undo: canvasSession.undo,
    redo: canvasSession.redo,
    generatePredictions: imageLabeler.generatePredictions,
    smartSegment,
    acceptPrediction,
    rejectPrediction: imageLabeler.rejectPrediction,
    goToNextItem,
    goToPreviousItem,
    projectItems,
    // Incremental loading + server search for the file panel.
    itemsTotal,
    isItemsLoading,
    hasMoreItems,
    loadMoreItems,
    itemSearch: itemSearchDraft,
    setItemSearch: setItemSearchDraft,
    annotatedItemIds,
    currentItemId: itemId,
    navigateToItem,
    exportProject,
    isExporting,
    navigateBackToProjects: () => navigate("/projects"),
  }
}

export type StudioScreenViewModel = ReturnType<typeof useStudioScreenViewModel>
