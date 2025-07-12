import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { ProjectRepository } from "../../db/models"

export class FetchProjectsQuery implements IpcHandler<void, Project[]> {
  channel = "fetch:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<Project[]> {
    const projects = await ProjectRepository.findAll({
      order: [["createdAt", "DESC"]],
    })
    return projects.map((project) => {
      return {
        id: project.id,
        name: project.name,
        labels: project.labels ?? [],
        images: project.images ?? [],
        tasks: project.tasks ?? [],
      }
    })
  }
}
