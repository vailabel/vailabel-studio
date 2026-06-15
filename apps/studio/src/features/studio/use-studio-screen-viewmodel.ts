import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { PipelinePrompt } from "@/ipc/studio"
import {
  useCanvasContainer,
  useCanvasContextMenu,
  useCanvasDisplay,
  useCanvasPan,
  useCanvasSelection,
  useCanvasTool,
  useCanvasZoom,
} from "@/contexts/canvas-context"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"
import type { Annotation, ImageData, Label, Project } from "@/types/core"
import { openPathDialog } from "@/lib/desktop"
import { exportDataset, type ExportFormat } from "@/lib/export"
import { useImageLabelerViewModel } from "@/viewmodels/image-labeler-viewmodel"
import { useSettingsViewModel } from "@/viewmodels/settings-viewmodel"
import { useCanvasSession } from "./use-canvas-session"
import type { StudioHeaderStats } from "./types"

export function useStudioScreenViewModel(projectId?: string, imageId?: string) {
  const navigate = useNavigate()
  const imageLabeler = useImageLabelerViewModel(projectId, imageId)
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
  const [projectImages, setProjectImages] = useState<ImageData[]>([])
  const [annotatedImageIds, setAnnotatedImageIds] = useState<Set<string>>(
    new Set()
  )
  const [projectStats, setProjectStats] = useState<StudioHeaderStats>({
    totalImages: 0,
    labeledImages: 0,
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
        totalImages: 0,
        labeledImages: 0,
        totalLabels: 0,
      })
      setIsProjectSummaryLoading(false)
      return
    }

    const silent = options?.silent ?? false
    if (!silent) setIsProjectSummaryLoading(true)

    try {
      const [nextProject, images, annotations, labels] = await Promise.all([
        services.getProjectService().getById(effectiveProjectId),
        services.getImageService().getImagesByProjectId(effectiveProjectId),
        services.getAnnotationService().getAnnotationsByProjectId(effectiveProjectId),
        services.getLabelService().getLabelsByProjectId(effectiveProjectId),
      ])

      const labeledImages = new Set(
        annotations
          .map((annotation) => annotation.imageId || annotation.image_id || "")
          .filter(Boolean)
      )

      setProject(nextProject)
      setProjectImages(images)
      setAnnotatedImageIds(labeledImages)
      setProjectStats({
        totalImages: images.length,
        labeledImages: labeledImages.size,
        totalLabels: labels.length,
      })
    } finally {
      if (!silent) setIsProjectSummaryLoading(false)
    }
  }, [effectiveProjectId])

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
        }
      },
      ["projects", "images", "annotations", "labels"]
    ).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [effectiveProjectId, refreshProjectSummary])

  const navigateToImage = useCallback(
    (nextImageId: string | null | undefined) => {
      if (!effectiveProjectId || !nextImageId) return
      navigate(`/projects/${effectiveProjectId}/studio/${nextImageId}`)
    },
    [effectiveProjectId, navigate]
  )

  // Derive prev/next from the project's image list + the current image id —
  // the SAME list the file panel renders — so the header navigation can never
  // drift out of sync with what's actually loaded.
  const currentImageIndex = useMemo(
    () => projectImages.findIndex((entry) => entry.id === imageId),
    [projectImages, imageId]
  )
  const previousImageId =
    currentImageIndex > 0
      ? projectImages[currentImageIndex - 1]?.id ?? null
      : null
  const nextImageId =
    currentImageIndex >= 0 && currentImageIndex < projectImages.length - 1
      ? projectImages[currentImageIndex + 1]?.id ?? null
      : null

  const goToNextImage = useCallback(() => {
    navigateToImage(nextImageId)
  }, [nextImageId, navigateToImage])

  const goToPreviousImage = useCallback(() => {
    navigateToImage(previousImageId)
  }, [previousImageId, navigateToImage])

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
          services.getImageService().getImagesByProjectId(effectiveProjectId),
          services
            .getAnnotationService()
            .getAnnotationsByProjectId(effectiveProjectId),
          services.getLabelService().getLabelsByProjectId(effectiveProjectId),
        ])

        const annotationsByImage = new Map<string, Annotation[]>()
        for (const annotation of annotations) {
          const id = annotation.imageId || annotation.image_id || ""
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
      image: imageLabeler.image,
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
    currentImageIndex,
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
    undo: canvasSession.undo,
    redo: canvasSession.redo,
    generatePredictions: imageLabeler.generatePredictions,
    smartSegment,
    acceptPrediction,
    rejectPrediction: imageLabeler.rejectPrediction,
    goToNextImage,
    goToPreviousImage,
    projectImages,
    annotatedImageIds,
    currentImageId: imageId,
    navigateToImage,
    exportProject,
    isExporting,
    navigateBackToProjects: () => navigate("/projects"),
  }
}

export type StudioScreenViewModel = ReturnType<typeof useStudioScreenViewModel>
