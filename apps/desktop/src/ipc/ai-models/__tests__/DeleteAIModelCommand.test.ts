import { DeleteAIModelCommand } from "../DeleteAIModelCommand"
import { AIModelRepository } from "../../../db/models"

describe("DeleteAIModelCommand", () => {
  const command = new DeleteAIModelCommand()
  it("should call AIModelRepository.destroy with aiModel id", async () => {
    AIModelRepository.destroy = jest.fn()
    await command.handle({} as any, "1")
    expect(AIModelRepository.destroy).toHaveBeenCalledWith({
      where: { id: "1" },
    })
  })
})
