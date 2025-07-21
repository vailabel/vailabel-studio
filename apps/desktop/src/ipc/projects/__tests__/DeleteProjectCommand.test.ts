import { DeleteProjectCommand } from "../DeleteProjectCommand"
import { ProjectRepository } from "../../../db/models"

describe("DeleteProjectCommand", () => {
  const command = new DeleteProjectCommand()
  it("should call ProjectRepository.destroy with project id", async () => {
    ProjectRepository.destroy = jest.fn()
    await command.handle({} as any, "1")
    expect(ProjectRepository.destroy).toHaveBeenCalledWith({
      where: { id: "1" },
    })
  })
})
