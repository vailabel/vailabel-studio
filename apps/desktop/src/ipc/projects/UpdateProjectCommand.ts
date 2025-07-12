import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ProjectRepository } from "../../db/models"


export class UpdateProjectCommand implements IpcHandler<Project, void> {
  channel = "update:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    project: Project
  ): Promise<void> {
    // Update the project in the database
    await ProjectRepository.update(
      { ...project },
      { where: { id: project.id } }
    )
  }
}