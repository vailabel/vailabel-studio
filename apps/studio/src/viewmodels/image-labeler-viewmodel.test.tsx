import { act, renderHook, waitFor } from "@testing-library/react"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"
import { useImageLabelerViewModel } from "@/viewmodels/image-labeler-viewmodel"

jest.mock("@/ipc/events", () => ({
  listenToStudioEvents: jest.fn(),
}))

const mockListenToStudioEvents = jest.mocked(listenToStudioEvents)

const image = {
  id: "image-1",
  name: "Sample Image",
  data: "data:image/png;base64,AAAA",
  width: 100,
  height: 100,
  projectId: "project-1",
  project_id: "project-1",
}

const label = {
  id: "label-1",
  name: "Person",
  color: "#22c55e",
  projectId: "project-1",
  project_id: "project-1",
}

const annotation = {
  id: "annotation-1",
  name: "Person",
  type: "box",
  coordinates: [
    { x: 5, y: 5 },
    { x: 25, y: 25 },
  ],
  imageId: "image-1",
  image_id: "image-1",
  projectId: "project-1",
  project_id: "project-1",
  labelId: "label-1",
  label_id: "label-1",
  color: "#22c55e",
}

const prediction = {
  id: "prediction-1",
  name: "AI Detection",
  type: "box",
  coordinates: [
    { x: 10, y: 10 },
    { x: 30, y: 30 },
  ],
  confidence: 0.81,
  imageId: "image-1",
  image_id: "image-1",
  projectId: "project-1",
  project_id: "project-1",
  labelId: "label-1",
  label_id: "label-1",
  labelName: "Person",
  label_name: "Person",
  labelColor: "#22c55e",
  label_color: "#22c55e",
}

describe("useImageLabelerViewModel", () => {
  const mockImageService = {
    getImage: jest.fn(),
    getImagesByProjectId: jest.fn(),
  }
  const mockAnnotationService = {
    getAnnotationsByImageId: jest.fn(),
    createAnnotation: jest.fn(),
    updateAnnotation: jest.fn(),
    deleteAnnotation: jest.fn(),
  }
  const mockPredictionService = {
    listByImageId: jest.fn(),
    generate: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  }
  const mockLabelService = {
    getLabelsByProjectId: jest.fn(),
    createLabel: jest.fn(),
  }

  beforeEach(() => {
    jest.restoreAllMocks()

    jest.spyOn(services, "getImageService").mockReturnValue(
      mockImageService as unknown as ReturnType<typeof services.getImageService>
    )
    jest.spyOn(services, "getAnnotationService").mockReturnValue(
      mockAnnotationService as unknown as ReturnType<
        typeof services.getAnnotationService
      >
    )
    jest.spyOn(services, "getPredictionService").mockReturnValue(
      mockPredictionService as unknown as ReturnType<
        typeof services.getPredictionService
      >
    )
    jest.spyOn(services, "getLabelService").mockReturnValue(
      mockLabelService as unknown as ReturnType<typeof services.getLabelService>
    )

    mockImageService.getImage.mockResolvedValue(image)
    mockImageService.getImagesByProjectId.mockResolvedValue([image])
    mockAnnotationService.getAnnotationsByImageId.mockResolvedValue([annotation])
    mockPredictionService.listByImageId.mockResolvedValue([prediction])
    mockPredictionService.generate.mockResolvedValue([prediction])
    mockLabelService.getLabelsByProjectId.mockResolvedValue([label])
    mockListenToStudioEvents.mockImplementation(async () => () => {})
  })

  it("loads annotations, predictions, labels, and project images", async () => {
    const { result } = renderHook(() =>
      useImageLabelerViewModel("project-1", "image-1")
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.image?.id).toBe("image-1")
    expect(result.current.annotations).toEqual([annotation])
    expect(result.current.predictions).toEqual([prediction])
    expect(result.current.labels).toEqual([label])
    expect(mockPredictionService.listByImageId).toHaveBeenCalledWith("image-1")
  })

  it("refreshes when a matching studio event is emitted", async () => {
    let eventHandler:
      | ((event: {
          entity: string
          action: string
          id: string
          imageId?: string
          projectId?: string
          occurredAt: string
        }) => void)
      | undefined

    mockListenToStudioEvents.mockImplementation(async (handler) => {
      eventHandler = handler
      return () => {}
    })

    mockAnnotationService.getAnnotationsByImageId
      .mockResolvedValueOnce([annotation])
      .mockResolvedValueOnce([
        annotation,
        {
          ...annotation,
          id: "annotation-2",
        },
      ])
    mockPredictionService.listByImageId
      .mockResolvedValueOnce([prediction])
      .mockResolvedValueOnce([])

    const { result } = renderHook(() =>
      useImageLabelerViewModel("project-1", "image-1")
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      eventHandler?.({
        entity: "annotations",
        action: "created",
        id: "annotation-2",
        imageId: "image-1",
        projectId: "project-1",
        occurredAt: "2026-03-14T00:00:00Z",
      })
    })

    await waitFor(() => expect(result.current.annotations).toHaveLength(2))
    expect(result.current.predictions).toEqual([])
  })

  it("generates predictions through the prediction service", async () => {
    const nextPredictions = [
      {
        ...prediction,
        id: "prediction-2",
      },
    ]
    mockPredictionService.generate.mockResolvedValue(nextPredictions)

    const { result } = renderHook(() =>
      useImageLabelerViewModel("project-1", "image-1")
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.generatePredictions("model-1", 0.5)
    })

    expect(mockPredictionService.generate).toHaveBeenCalledWith({
      imageId: "image-1",
      modelId: "model-1",
      threshold: 0.5,
    })
    expect(result.current.predictions).toEqual(nextPredictions)
  })

  it("resets loading state when prediction generation fails", async () => {
    mockPredictionService.generate.mockRejectedValue(
      new Error("This model is not ready for AI detect.")
    )

    const { result } = renderHook(() =>
      useImageLabelerViewModel("project-1", "image-1")
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.generatePredictions("model-1", 0.5)
      })
    ).rejects.toThrow("This model is not ready for AI detect.")

    expect(result.current.isGeneratingPredictions).toBe(false)
    expect(result.current.predictions).toEqual([prediction])
  })
})
