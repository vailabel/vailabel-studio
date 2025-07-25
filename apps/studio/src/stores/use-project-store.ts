/* eslint-disable @typescript-eslint/no-unused-vars */
import { Project } from "@vailabel/core"
import { create } from "zustand"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { exceptionMiddleware } from "@/hooks/exception-middleware"
import { IStorageAdapter } from "@/adapters/storage"

export interface CurrentProject extends Project {
  imageCount: number
  labelCount: number
}

type ProjectStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void

  storage: IStorageAdapter
  initStorageAdapter: (storageAdapter: IStorageAdapter) => void

  projects: Project[]
  currentProject?: CurrentProject
  setCurrentProject: (project: CurrentProject) => void
  getProject(id: string): Promise<CurrentProject | undefined>
  getProjects: () => Promise<Project[]>
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
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),
    storage: {} as IStorageAdapter,
    initStorageAdapter: (storageAdapter) => set({ storage: storageAdapter }),
    projects: [],
    currentProject: undefined,
    setCurrentProject: (project) => set({ currentProject: project }),

    getProject: async (id) => {
      const { data } = get()
      const project = await data
        .fetchProjects()
        .then((projects) => projects.find((p) => p.id === id))
      return project as CurrentProject | undefined
    },

    getProjects: async () => {
      const { data } = get()
      const projects = await data.fetchProjects()
      set({ projects })
      return projects
    },

    createProject: async (project) => {
      const { data, projects } = get()
      await data.saveProject(project)
      set({ projects: [...projects, project] })
    },

    updateProject: async (id, updates) => {
      const { data, projects } = get()
      const updatedProjects = projects.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      )
      // Convert all updated projects to plain objects to strip Sequelize methods
      const plainProjects = updatedProjects.map(
        (proj) => JSON.parse(JSON.stringify(proj)) as Project
      )
      set({ projects: plainProjects })
      const updatedProject = plainProjects.find((p) => p.id === id)!
      await data.saveProject(updatedProject)
    },

    deleteProject: async (id) => {
      const { data, projects } = get()
      await data.deleteProject(id)
      //delete images associated with the project
      set({ projects: projects.filter((project) => project.id !== id) })
    },

    getNextImage: async (projectId, currentImageId) => {
      // Implementation for fetching the next image
      return { id: `next-${currentImageId}-${projectId}`, hasNext: true }
    },

    getPreviousImage: async (projectId, currentImageId) => {
      // Implementation for fetching the previous image
      return { id: `prev-${currentImageId}-${projectId}`, hasPrevious: true }
    },

    nextImage: { id: "", hasNext: false },
    previousImage: { id: "", hasPrevious: false },
  }))
)
