import { IDBContext, Project } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

export interface CurrentProject extends Project {
  imageCount: number
  labelCount: number
}

type ProjectStoreType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
  projects: Project[]
  currentProject?: CurrentProject
  setCurrentProject: (project: CurrentProject) => void
  getProject(id: string): Promise<CurrentProject | undefined>
  getProjects: () => Project[]
  setProjects: (projects: Project[]) => void
  createProject: (project: Project) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  getNextImage: (
    projectId: string,
    currentImageId: string
  ) => Promise<{ id: string; hasNext: boolean }>
  getPreviousImage: (
    projectId: string,
    currentImageId: string
  ) => Promise<{ id: string; hasPrevious: boolean }>

  nextImage: {
    id: string
    hasNext: boolean
  }
  previousImage: {
    id: string
    hasPrevious: boolean
  }
}

export const useProjectStore = create<ProjectStoreType>(
  exceptionMiddleware((set, get) => ({
    dbContext: {} as IDBContext,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    projects: [],
    currentProject: undefined,
    setProjects: (projects) => set({ projects }),
    setCurrentProject: (project) => set({ currentProject: project }),

    nextImage: {
      id: "",
      hasNext: false,
    },
    previousImage: {
      id: "",
      hasPrevious: false,
    },

    getNextImage: async (projectId, currentImageId) => {
      const { dbContext } = get()
      const nextImage = await dbContext.images.getNext(
        projectId,
        currentImageId
      )

      const next = {
        id: nextImage.id ?? "",
        hasNext: nextImage.hasNext ?? false,
      }
      set({ nextImage: next })
      return next
    },
    getPreviousImage: async (projectId, currentImageId) => {
      const { dbContext } = get()
      const previousImage = await dbContext.images.getPrevious(
        projectId,
        currentImageId
      )
      const previous = {
        id: previousImage.id ?? "",
        hasPrevious: previousImage.hasPrevious ?? false,
      }
      set({ previousImage: previous })
      return previous
    },

    getProjects: () => {
      const { dbContext, projects, setProjects } = get()
      dbContext.projects.get().then((allProjects: Project[]) => {
        setProjects(allProjects)
      })
      return projects
    },
    getProject: async (id) => {
      const { dbContext } = get()
      const project = await dbContext.projects.getById(id)

      if (project) {
        const imageCount = await dbContext.images.countByProjectId(id)
        const labelCount = await dbContext.labels.countByProjectId(id)
        set({
          currentProject: {
            ...project,
            imageCount,
            labelCount,
          },
        })
        return {
          ...project,
          imageCount,
          labelCount,
        }
      }
      return undefined
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
