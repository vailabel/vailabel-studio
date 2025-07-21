import { SaveTaskCommand } from "../SaveTaskCommand"
import { TaskRepository } from "../../../db/models"

describe("SaveTaskCommand", () => {
  const command = new SaveTaskCommand()
  const task = {
    id: "1",
    name: "Task 1",
    description: "desc",
    status: "open",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
    projectId: "p1",
  }

  it("should call TaskRepository.create with task data", async () => {
    TaskRepository.create = jest.fn()
    await command.handle({} as any, task as any)
    expect(TaskRepository.create).toHaveBeenCalledWith(task)
  })
})
