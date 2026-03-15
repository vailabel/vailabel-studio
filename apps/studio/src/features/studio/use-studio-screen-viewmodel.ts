import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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
import {
  canAttemptModelPrediction,
  getModelUnsupportedReason,
  getPredictionReadinessLabel,
  isModelPredictionReady,
  willModelConvertOnRun,
} from "@/lib/ai-model-metadata"
import { services } from "@/services"
import type { Project } from "@/types/core"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import { useImageLabelerViewModel } from "@/viewmodels/image-labeler-viewmodel"
import { useSettingsViewModel } from "@/viewmodels/settings-viewmodel"
import { useCanvasSession } from "./use-canvas-session"
import type { StudioHeaderStats } from "./types"

export function useStudioScreenViewModel(projectId?: string, imageId?: string) {
  const navigate = useNavigate()
  const imageLabeler = useImageLabelerViewModel(projectId, imageId)
  const aiModels = useAIModelViewModel()
  const settings = useSettingsViewModel()
  const { contextMenu, setContextMenu } = useCanvasContextMenu()
  const { container, setContainer } = useCanvasContainer()
  const { selectedAnnotation, setSelectedAnnotation } = useCanvasSelection()
  const { selectedTool, setSelectedTool } = useCanvasTool()
  const { zoom, zoomIn, zoomOut } = useCanvasZoom()
  const { resetView } = useCanvasPan()
  const { showCrosshair, showCoordinates, setShowCrosshair, setShowCoordinates } =
    useCanvasDisplay()

  const [project, setProject] = useState<Project | null>(null)
  const [projectStats, setProjectStats] = useState<StudioHeaderStats>({
    totalImages: 0,
    labeledImages: 0,
    totalLabels: 0,
  })
  const [isProjectSummaryLoading, setIsProjectSummaryLoading] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAIModelModal, setShowAIModelModal] = useState(false)

  const effectiveProjectId = useMemo(
    () =>
      projectId ||
      imageLabeler.image?.projectId ||
      imageLabeler.image?.project_id ||
      "",
    [imageLabeler.image?.projectId, imageLabeler.image?.project_id, projectId]
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

  const refreshProjectSummary = useCallback(async () => {
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

    setIsProjectSummaryLoading(true)

    try {
      const [nextProject, images, annotations, labels] = await Promise.all([
        services.getProjectService().getById(effectiveProjectId),
        services.getImageService().getImagesByProjectId(effectiveProjectId),
        services.getAnnotationService().getAnnotationsByProjectId(effectiveProjectId),
        services.getLabelService().getLabelsByProjectId(effectiveProjectId),
      ])

      const labeledImages = new Set(
        annotations.map((annotation) => annotation.imageId || annotation.image_id || "")
      )

      setProject(nextProject)
      setProjectStats({
        totalImages: images.length,
        labeledImages: Array.from(labeledImages).filter(Boolean).length,
        totalLabels: labels.length,
      })
    } finally {
      setIsProjectSummaryLoading(false)
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
          void refreshProjectSummary()
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

  const goToNextImage = useCallback(() => {
    navigateToImage(imageLabeler.nextId || imageLabeler.goToNextImage())
  }, [imageLabeler, navigateToImage])

  const goToPreviousImage = useCallback(() => {
    navigateToImage(imageLabeler.prevId || imageLabeler.goToPreviousImage())
  }, [imageLabeler, navigateToImage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)

      if (isTypingTarget) {
        return
      }

      if (event.key === "ArrowRight" || event.code === "ArrowRight") {
        goToNextImage()
        return
      }

      if (event.key === "ArrowLeft" || event.code === "ArrowLeft") {
        goToPreviousImage()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToNextImage, goToPreviousImage])

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
    async (predictionId: string) => {
      const createdAnnotation = await imageLabeler.acceptPrediction(predictionId)
      canvasSession.recordExternalCreate(createdAnnotation, `Accept ${createdAnnotation.name}`)
      setSelectedAnnotation(createdAnnotation)
      return createdAnnotation
    },
    [canvasSession, imageLabeler, setSelectedAnnotation]
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

  const selectedModel = aiModels.selectedModel
  const selectedModelCanAttemptPrediction = canAttemptModelPrediction(selectedModel)

  return {
    data: {
      image: imageLabeler.image,
      annotations: imageLabeler.annotations,
      predictions: imageLabeler.predictions,
      labels: imageLabeler.labels,
      isLoading: imageLabeler.isLoading,
      error: imageLabeler.error,
    },
    project,
    projectStats,
    isProjectSummaryLoading,
    effectiveProjectId,
    selectedAnnotation,
    selectedTool,
    zoom,
    showCrosshair,
    showCoordinates,
    contextMenu,
    container,
    canUndo: canvasSession.canUndo,
    canRedo: canvasSession.canRedo,
    historyPast: canvasSession.historyPast,
    isGeneratingPredictions: imageLabeler.isGeneratingPredictions,
    hasNext: imageLabeler.hasNext,
    hasPrevious: imageLabeler.hasPrevious,
    nextId: imageLabeler.nextId,
    prevId: imageLabeler.prevId,
    showSettingsModal,
    showAIModelModal,
    selectedModel,
    selectedModelId: aiModels.selectedModelId,
    selectedModelPredictionReady: isModelPredictionReady(selectedModel),
    selectedModelCanAttemptPrediction,
    selectedModelWillConvertOnRun: willModelConvertOnRun(selectedModel),
    selectedModelUnsupportedReason: getModelUnsupportedReason(selectedModel),
    selectedModelReadinessLabel: getPredictionReadinessLabel(selectedModel),
    setContainer,
    setSelectedTool,
    zoomIn,
    zoomOut,
    resetView,
    toggleCrosshair,
    toggleCoordinates,
    openContextMenu,
    closeContextMenu,
    openSettingsModal: () => setShowSettingsModal(true),
    closeSettingsModal: () => setShowSettingsModal(false),
    openAIModelModal: () => setShowAIModelModal(true),
    closeAIModelModal: () => setShowAIModelModal(false),
    refreshProjectSummary,
    refreshAnnotations: imageLabeler.refreshAnnotations,
    createAnnotationFromDraft: canvasSession.createAnnotationFromDraft,
    updateAnnotation: canvasSession.updateAnnotation,
    deleteAnnotation: canvasSession.deleteAnnotation,
    undo: canvasSession.undo,
    redo: canvasSession.redo,
    generatePredictions: imageLabeler.generatePredictions,
    acceptPrediction,
    rejectPrediction: imageLabeler.rejectPrediction,
    goToNextImage,
    goToPreviousImage,
    navigateBackToProjects: () => navigate("/projects"),
  }
}

export type StudioScreenViewModel = ReturnType<typeof useStudioScreenViewModel>
