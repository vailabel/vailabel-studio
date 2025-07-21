import { UpdateTaskCommand } from "../UpdateTaskCommand"
import { TaskRepository } from "../../../db/models"

describe("UpdateTaskCommand", () => {
  const command = new UpdateTaskCommand()
  const task = {
    id: "1",
    name: "Task 1",
    description: "desc",
    status: "open",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
    projectId: "p1",
  }

  it("should call TaskRepository.update with task data and id", async () => {
    TaskRepository.update = jest.fn()
    await command.handle({} as any, task as any)
    expect(TaskRepository.update).toHaveBeenCalledWith(task, {
      where: { id: task.id },
    })
  })
})
