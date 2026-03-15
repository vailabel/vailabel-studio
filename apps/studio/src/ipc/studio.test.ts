import { invoke } from "@tauri-apps/api/core"
import { studioCommands } from "@/ipc/studio"

jest.mock("@tauri-apps/api/core", () => ({
  invoke: jest.fn(),
}))

const mockInvoke = jest.mocked(invoke)

describe("studioCommands", () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it("calls predictions_generate with the typed payload", async () => {
    mockInvoke.mockResolvedValue([])

    await studioCommands.predictionsGenerate({
      imageId: "image-1",
      modelId: "model-1",
      threshold: 0.65,
    })

    expect(mockInvoke).toHaveBeenCalledWith("predictions_generate", {
      payload: {
        imageId: "image-1",
        modelId: "model-1",
        threshold: 0.65,
      },
    })
  })

  it("calls ai_models_import with local import payload", async () => {
    mockInvoke.mockResolvedValue({})

    await studioCommands.aiModelsImport({
      name: "Local Model",
      description: "Custom detector",
      version: "1.0.0",
      category: "detection",
      type: "object_detection",
      modelFilePath: "C:/models/local.onnx",
      configFilePath: "C:/models/local.yaml",
      projectId: "project-1",
    })

    expect(mockInvoke).toHaveBeenCalledWith("ai_models_import", {
      payload: {
        name: "Local Model",
        description: "Custom detector",
        version: "1.0.0",
        category: "detection",
        type: "object_detection",
        modelFilePath: "C:/models/local.onnx",
        configFilePath: "C:/models/local.yaml",
        projectId: "project-1",
      },
    })
  })
})
