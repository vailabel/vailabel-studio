import { FetchTaskQuery } from "../FetchTaskQuery"
import { TaskRepository } from "../../../db/models"

describe("FetchTaskQuery", () => {
  const query = new FetchTaskQuery()

  it("should return mapped tasks", async () => {
    const mockTasks = [
      {
        id: "1",
        name: "Task 1",
        description: "desc",
        status: "open",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        projectId: "p1",
      },
    ]
    jest.spyOn(TaskRepository, "findAll").mockResolvedValue(mockTasks as any)
    const result = await query.handle({} as any)
    expect(result).toEqual([
      {
        id: "1",
        name: "Task 1",
        description: "desc",
        status: "open",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        projectId: "p1",
      },
    ])
    expect(TaskRepository.findAll).toHaveBeenCalled()
  })
})
