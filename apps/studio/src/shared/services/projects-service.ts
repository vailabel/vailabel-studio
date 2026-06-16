import { Project } from "@/shared/types/core"
import { studioCommands } from "@/shared/ipc/studio"

export const projectsService = {
  list: () => studioCommands.projectsList(),
  getById: (projectId: string) => studioCommands.projectsGet(projectId),
  create: (project: Partial<Project>) => studioCommands.projectsSave(project),
  update: (projectId: string, updates: Partial<Project>) =>
    studioCommands.projectsSave({ id: projectId, ...updates }),
  delete: (projectId: string) => studioCommands.projectsDelete(projectId),
}

