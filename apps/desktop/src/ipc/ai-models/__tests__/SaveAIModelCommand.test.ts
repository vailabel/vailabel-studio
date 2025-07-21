import { SaveAIModelCommand } from "../SaveAIModelCommand"
import { AIModelRepository } from "../../../db/models"

describe("SaveAIModelCommand", () => {
  const command = new SaveAIModelCommand()
  it("should call AIModelRepository.create with aiModel data", async () => {
    const aiModel = {
      id: "1",
      name: "Model 1",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
      description: "desc",
      version: "v1",
      modelPath: "/path/model",
      configPath: "/path/config",
      modelSize: 123,
      isCustom: true,
    }
    AIModelRepository.create = jest.fn()
    await command.handle({} as any, aiModel as any)
    expect(AIModelRepository.create).toHaveBeenCalledWith(aiModel)
  })
})
