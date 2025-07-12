import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"


export class DeleteProjectCommand
  implements IpcHandler<{ project: Project }, void>
{
  channel = "delete:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    { project }: { project: Project }
  ): Promise<void> {
    // delete the project
    await project.destroy()
  }
}