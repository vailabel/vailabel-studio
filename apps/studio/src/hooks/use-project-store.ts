import { IDBContext, Project } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

type ProjectStoreType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
  projects: Project[]
  getProject(id: string): Project | undefined
  getProjects: () => Project[]
  setProjects: (projects: Project[]) => void
  createProject: (project: Project) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectStoreType>(
  exceptionMiddleware((set, get) => ({
    dbContext: {} as IDBContext,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    projects: [],
    setProjects: (projects) => set({ projects }),
    getProjects: () => {
      const { dbContext, projects, setProjects } = get()
      dbContext.projects.get().then((allProjects: Project[]) => {
        setProjects(allProjects)
      })
      return projects
    },
    getProject: (id) => {
      const { projects, dbContext, setProjects } = get()
      dbContext.projects.get().then((allProjects: Project[]) => {
        setProjects(allProjects)
      })
      return projects.find((project) => project.id === id)
    },
    createProject: async (project) => {
      const { projects, dbContext } = get()
      set({ projects: [...projects, project] })
      if (dbContext) {
        await dbContext.projects.create(project)
      }
    },
    updateProject: async (id, updates) => {
      const { projects, dbContext } = get()
      const updatedProjects = projects.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      )
      set({ projects: updatedProjects })
      if (dbContext) {
        await dbContext.projects.update(id, updates)
      }
    },
    deleteProject: async (id) => {
      const { projects, dbContext } = get()
      const updatedProjects = projects.filter((project) => project.id !== id)
      set({ projects: updatedProjects })
      if (dbContext) {
        await dbContext.projects.delete(id)
      }
    },
  }))
)
