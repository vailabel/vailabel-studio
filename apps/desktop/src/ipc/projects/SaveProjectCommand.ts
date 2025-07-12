import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ProjectRepository } from "../../db/models"

export class SaveProjectCommand implements IpcHandler<Project, void> {
  channel = "save:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    project: Project
  ): Promise<void> {
    await ProjectRepository.create({
      ...project
    })
  }
}
