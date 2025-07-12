import { Project } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"

export class FetchProjectsQuery implements IpcHandler<void, Project[]> {
  channel = "fetch:projects"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<Project[]> {
    const projects = await Project.findAll()
    console.log("Fetched projects:", projects)
    return projects
  }
}
