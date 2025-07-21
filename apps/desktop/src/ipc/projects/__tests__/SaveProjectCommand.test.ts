import { SaveProjectCommand } from "../SaveProjectCommand"
import { ProjectRepository } from "../../../db/models"

describe("SaveProjectCommand", () => {
  const command = new SaveProjectCommand()
  const project = {
    id: "1",
    name: "Project 1",
    labels: ["label1"],
    images: ["img1"],
    tasks: ["task1"],
  }

  it("should call ProjectRepository.create with project data", async () => {
    ProjectRepository.create = jest.fn()
    await command.handle({} as any, project as any)
    expect(ProjectRepository.create).toHaveBeenCalledWith(project)
  })
})
