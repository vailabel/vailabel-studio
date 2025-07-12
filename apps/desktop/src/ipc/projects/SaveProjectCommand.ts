import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { sequelize } from "../../db/sequelize"

// Associate the Project model with the sequelize instance
sequelize.addModels([Project])

export class SaveProjectCommand
  implements IpcHandler<{ project: Project }, void>
{
  channel = "save:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    { project }: { project: Project }
  ): Promise<void> {
    try {
      const projectInstance = await Project.build({ ...project })
      await projectInstance.save()
    } catch (error) {
      console.error("Failed to save project:", error)
      throw error
    }
  }
}
