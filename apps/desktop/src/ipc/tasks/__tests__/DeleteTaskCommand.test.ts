import { DeleteTaskCommand } from "../DeleteTaskCommand"
import { TaskRepository } from "../../../db/models"

jest.mock("../../../db/models", () => ({
  TaskRepository: { destroy: jest.fn() },
}))

describe("DeleteTaskCommand", () => {
  const command = new DeleteTaskCommand()
  it("should call TaskRepository.destroy with task id", async () => {
    await command.handle({} as any, "1")
    expect(TaskRepository.destroy).toHaveBeenCalledWith({ where: { id: "1" } })
  })
})
