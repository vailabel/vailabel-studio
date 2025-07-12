import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ProjectRepository } from "../../db/models"

export class DeleteProjectCommand implements IpcHandler<Project, void> {
  channel = "delete:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    request: Project
  ): Promise<void> {
    await ProjectRepository.destroy({
      where: {
        id: request.id,
      },
    })
  }
}
