import { UpdateProjectCommand } from "../UpdateProjectCommand"
import { ProjectRepository } from "../../../db/models"

describe("UpdateProjectCommand", () => {
  const command = new UpdateProjectCommand()
  const project = {
    id: "1",
    name: "Project 1",
    labels: ["label1"],
    images: ["img1"],
    tasks: ["task1"],
  }

  it("should call ProjectRepository.update with project data and id", async () => {
    ProjectRepository.update = jest.fn()
    await command.handle({} as any, project as any)
    expect(ProjectRepository.update).toHaveBeenCalledWith(project, {
      where: { id: project.id },
    })
  })
})
