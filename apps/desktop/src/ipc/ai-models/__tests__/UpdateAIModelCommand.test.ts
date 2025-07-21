import { UpdateAIModelCommand } from "../UpdateAIModelCommand"
import { AIModelRepository } from "../../../db/models"

describe("UpdateAIModelCommand", () => {
  const command = new UpdateAIModelCommand()
  it("should call AIModelRepository.update with aiModel data and id", async () => {
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
    AIModelRepository.update = jest.fn()
    await command.handle({} as any, aiModel as any)
    expect(AIModelRepository.update).toHaveBeenCalledWith(aiModel, {
      where: { id: aiModel.id },
    })
  })
})
