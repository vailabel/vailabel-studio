import { FetchProjectsQuery } from "../FetchProjectsQuery"
import { ProjectRepository } from "../../../db/models"

describe("FetchProjectsQuery", () => {
  const query = new FetchProjectsQuery()

  it("should return mapped projects", async () => {
    const mockProjects = [
      {
        id: "1",
        name: "Project 1",
        labels: ["label1"],
        images: ["img1"],
        tasks: ["task1"],
      },
    ]
    jest
      .spyOn(ProjectRepository, "findAll")
      .mockResolvedValue(mockProjects as any)
    const result = await query.handle({} as any)
    expect(result).toEqual([
      {
        id: "1",
        name: "Project 1",
        labels: ["label1"],
        images: ["img1"],
        tasks: ["task1"],
      },
    ])
    expect(ProjectRepository.findAll).toHaveBeenCalledWith({
      order: [["createdAt", "DESC"]],
    })
  })
})
