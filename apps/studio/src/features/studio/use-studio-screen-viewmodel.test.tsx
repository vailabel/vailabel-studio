import { act, renderHook, waitFor } from "@testing-library/react"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"
import { useStudioScreenViewModel } from "@/features/studio/use-studio-screen-viewmodel"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import { useImageLabelerViewModel } from "@/viewmodels/image-labeler-viewmodel"
import { useSettingsViewModel } from "@/viewmodels/settings-viewmodel"

const mockNavigate = jest.fn()

const mockCanvasState = {
  contextMenu: { visible: false, x: 0, y: 0, items: [] as unknown[] },
  setContextMenu: jest.fn(),
  container: { width: 0, height: 0 },
  setContainer: jest.fn(),
  selectedAnnotation: null,
  setSelectedAnnotation: jest.fn(),
  selectedTool: "move" as const,
  setSelectedTool: jest.fn(),
  zoom: 1,
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  resetView: jest.fn(),
  showCrosshair: true,
  showCoordinates: true,
  setShowCrosshair: jest.fn(),
  setShowCoordinates: jest.fn(),
}

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}))

jest.mock("@/ipc/events", () => ({
  listenToStudioEvents: jest.fn(),
}))

jest.mock("@/viewmodels/image-labeler-viewmodel", () => ({
  useImageLabelerViewModel: jest.fn(),
}))

jest.mock("@/viewmodels/ai-model-viewmodel", () => ({
  useAIModelViewModel: jest.fn(),
}))

jest.mock("@/viewmodels/settings-viewmodel", () => ({
  useSettingsViewModel: jest.fn(),
}))

jest.mock("@/contexts/canvas-context", () => ({
  useCanvasContextMenu: () => ({
    contextMenu: mockCanvasState.contextMenu,
    setContextMenu: mockCanvasState.setContextMenu,
  }),
  useCanvasContainer: () => ({
    container: mockCanvasState.container,
    setContainer: mockCanvasState.setContainer,
  }),
  useCanvasSelection: () => ({
    selectedAnnotation: mockCanvasState.selectedAnnotation,
    setSelectedAnnotation: mockCanvasState.setSelectedAnnotation,
  }),
  useCanvasTool: () => ({
    selectedTool: mockCanvasState.selectedTool,
    setSelectedTool: mockCanvasState.setSelectedTool,
  }),
  useCanvasZoom: () => ({
    zoom: mockCanvasState.zoom,
    zoomIn: mockCanvasState.zoomIn,
    zoomOut: mockCanvasState.zoomOut,
  }),
  useCanvasPan: () => ({
    resetView: mockCanvasState.resetView,
  }),
  useCanvasDisplay: () => ({
    showCrosshair: mockCanvasState.showCrosshair,
    showCoordinates: mockCanvasState.showCoordinates,
    setShowCrosshair: mockCanvasState.setShowCrosshair,
    setShowCoordinates: mockCanvasState.setShowCoordinates,
  }),
}))

const mockListenToStudioEvents = jest.mocked(listenToStudioEvents)
const mockUseImageLabelerViewModel = jest.mocked(useImageLabelerViewModel)
const mockUseAIModelViewModel = jest.mocked(useAIModelViewModel)
const mockUseSettingsViewModel = jest.mocked(useSettingsViewModel)

describe("useStudioScreenViewModel", () => {
  const mockProjectService = {
    getById: jest.fn(),
  }
  const mockImageService = {
    getImagesByProjectId: jest.fn(),
  }
  const mockAnnotationService = {
    getAnnotationsByProjectId: jest.fn(),
  }
  const mockLabelService = {
    getLabelsByProjectId: jest.fn(),
  }

  const createdAnnotation = {
    id: "annotation-2",
    name: "Prediction",
    type: "box",
    coordinates: [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ],
    imageId: "image-1",
    image_id: "image-1",
    projectId: "project-1",
    project_id: "project-1",
    color: "#22c55e",
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jest
      .spyOn(services, "getProjectService")
      .mockReturnValue(mockProjectService as unknown as ReturnType<
        typeof services.getProjectService
      >)
    jest.spyOn(services, "getImageService").mockReturnValue(
      mockImageService as unknown as ReturnType<typeof services.getImageService>
    )
    jest.spyOn(services, "getAnnotationService").mockReturnValue(
      mockAnnotationService as unknown as ReturnType<
        typeof services.getAnnotationService
      >
    )
    jest.spyOn(services, "getLabelService").mockReturnValue(
      mockLabelService as unknown as ReturnType<typeof services.getLabelService>
    )

    mockProjectService.getById.mockResolvedValue({
      id: "project-1",
      name: "Vehicles",
      type: "object_detection",
      status: "active",
    })
    mockImageService.getImagesByProjectId.mockResolvedValue([
      { id: "image-1" },
      { id: "image-2" },
    ])
    mockAnnotationService.getAnnotationsByProjectId.mockResolvedValue([
      { id: "annotation-1", imageId: "image-1", image_id: "image-1" },
    ])
    mockLabelService.getLabelsByProjectId.mockResolvedValue([
      { id: "label-1", name: "Car", color: "#22c55e" },
      { id: "label-2", name: "Truck", color: "#2563eb" },
    ])

    mockUseImageLabelerViewModel.mockReturnValue({
      image: {
        id: "image-1",
        name: "image-1",
        data: "data:image/png;base64,AAAA",
        width: 100,
        height: 100,
        projectId: "project-1",
        project_id: "project-1",
      },
      annotations: [],
      predictions: [],
      labels: [],
      nextId: "image-2",
      prevId: null,
      hasNext: true,
      hasPrevious: false,
      isLoading: false,
      isGeneratingPredictions: false,
      error: null,
      createAnnotationFromDraft: jest.fn(),
      createAnnotation: jest.fn(),
      updateAnnotation: jest.fn(),
      deleteAnnotation: jest.fn(),
      generatePredictions: jest.fn(),
      acceptPrediction: jest.fn().mockResolvedValue(createdAnnotation),
      rejectPrediction: jest.fn(),
      refreshAnnotations: jest.fn(),
      goToNextImage: jest.fn().mockReturnValue("image-2"),
      goToPreviousImage: jest.fn().mockReturnValue(null),
    } as unknown as ReturnType<typeof useImageLabelerViewModel>)

    mockUseAIModelViewModel.mockReturnValue({
      selectedModelId: "model-1",
      selectedModel: {
        id: "model-1",
        name: "YOLO",
        description: "Detection model",
        version: "1.0.0",
        modelPath: "/tmp/model.onnx",
        configPath: "",
        modelSize: 1,
        isCustom: false,
        backend: "cpu",
        status: "ready",
        modelMetadata: {
          supportsPrediction: true,
        },
      },
    } as unknown as ReturnType<typeof useAIModelViewModel>)

    mockUseSettingsViewModel.mockReturnValue({
      showCrosshairs: false,
      showCoordinates: true,
      updateCrosshairs: jest.fn().mockResolvedValue(true),
      updateCoordinates: jest.fn().mockResolvedValue(true),
    } as unknown as ReturnType<typeof useSettingsViewModel>)

    mockListenToStudioEvents.mockImplementation(async () => () => {})
  })

  it("loads project summary and syncs canvas display settings", async () => {
    const { result } = renderHook(() =>
      useStudioScreenViewModel("project-1", "image-1")
    )

    await waitFor(() => expect(result.current.project?.name).toBe("Vehicles"))

    expect(result.current.projectStats).toEqual({
      totalImages: 2,
      labeledImages: 1,
      totalLabels: 2,
    })
    expect(mockCanvasState.setShowCrosshair).toHaveBeenCalledWith(false)
    expect(mockCanvasState.setShowCoordinates).toHaveBeenCalledWith(true)
    expect(result.current.selectedModelCanAttemptPrediction).toBe(true)
  })

  it("navigates between images and records accepted predictions in history", async () => {
    const { result } = renderHook(() =>
      useStudioScreenViewModel("project-1", "image-1")
    )

    await waitFor(() => expect(result.current.project?.id).toBe("project-1"))

    act(() => {
      result.current.goToNextImage()
    })

    expect(mockNavigate).toHaveBeenCalledWith("/projects/project-1/studio/image-2")

    await act(async () => {
      await result.current.acceptPrediction("prediction-1")
    })

    expect(result.current.canUndo).toBe(true)

    await act(async () => {
      await result.current.undo()
    })

    expect(
      (
        mockUseImageLabelerViewModel.mock.results[0]?.value as ReturnType<
          typeof useImageLabelerViewModel
        >
      ).deleteAnnotation
    ).toHaveBeenCalledWith(createdAnnotation.id)
  })
})
