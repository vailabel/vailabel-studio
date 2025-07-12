import { Project } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"

export interface CurrentProject extends Project {
  imageCount: number
  labelCount: number
}

type ProjectStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void
  
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
    
    projects: [],
    currentProject: undefined,
    setCurrentProject: (project) => set({ currentProject: project }),
    
    getProject: async (id) => {
      const { data } = get()
      const project = await data.fetchProjects().then((projects) =>
        projects.find((p) => p.id === id)
      )
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
      const plainProjects = updatedProjects.map((proj) =>
        JSON.parse(JSON.stringify(proj)) as Project
      )
      set({ projects: plainProjects })
      const updatedProject = plainProjects.find((p) => p.id === id)!
      await data.saveProject(updatedProject)
    },
    
    deleteProject: async (id) => {
      const { data, projects } = get()
      await data.deleteProject(id)
      set({ projects: projects.filter((project) => project.id !== id) })
    },

    getNextImage: async (projectId, currentImageId) => {
      // Implementation for fetching the next image
      return { id: "", hasNext: false }
    },

    getPreviousImage: async (projectId, currentImageId) => {
      // Implementation for fetching the previous image
      return { id: "", hasPrevious: false }
    },

    nextImage: { id: "", hasNext: false },
    previousImage: { id: "", hasPrevious: false },
  }))
)
