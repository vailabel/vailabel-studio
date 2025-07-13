import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ProjectRepository } from "../../db/models"

export class DeleteProjectCommand implements IpcHandler<string, void> {
  channel = "delete:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    projectId: string
  ): Promise<void> {
    await ProjectRepository.destroy({
      where: {
        id: projectId,
      },
    })
  }
}
