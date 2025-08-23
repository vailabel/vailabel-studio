/* eslint-disable @typescript-eslint/no-unused-vars */
import { Project, ImageData } from "@vailabel/core"
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

  // internal caches
  imageIdListCache: Record<string, string[]>
  imageDataCache: Record<string, Record<string, ImageData | undefined>>

  // helper to clear cache for a project
  clearImageCache: (projectId: string) => void

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

    // caches
    imageIdListCache: {},
    imageDataCache: {},
    clearImageCache: (projectId: string) =>
      set((state) => ({
        imageIdListCache: { ...state.imageIdListCache, [projectId]: [] },
        imageDataCache: { ...state.imageDataCache, [projectId]: {} },
      })),

    getNextImage: async (projectId, currentImageId) => {
      const { data, imageIdListCache, imageDataCache } = get()

      // ensure id list cache exists
      let idList = imageIdListCache[projectId]
      if (!idList || idList.length === 0) {
        const all = await data.fetchImageDataByProjectId(projectId)
        idList = all.map((img) => img.id)
        set((state) => ({
          imageIdListCache: { ...state.imageIdListCache, [projectId]: idList },
        }))
      }

      const idx = idList.findIndex((id) => id === currentImageId)
      const nextIndex = idx >= 0 ? idx + 1 : 0
      const hasNext = nextIndex < idList.length
      const nextId = hasNext ? idList[nextIndex] : ""

      // prefetch next window (lazy): fetch up to 10 images starting at nextIndex
      if (hasNext) {
        const start = nextIndex
        const limit = 10
        try {
          const images = await data.fetchImageDataRange(projectId, start, limit)
          const projectCache = imageDataCache[projectId] || {}
          images.forEach((img) => (projectCache[img.id] = img))
          set((state) => ({
            imageDataCache: {
              ...state.imageDataCache,
              [projectId]: projectCache,
            },
          }))
        } catch {
          // ignore
        }
      }

      return { id: nextId, hasNext }
    },

    getPreviousImage: async (projectId, currentImageId) => {
      const { data, imageIdListCache, imageDataCache } = get()

      // ensure id list cache exists
      let idList = imageIdListCache[projectId]
      if (!idList || idList.length === 0) {
        const all = await data.fetchImageDataByProjectId(projectId)
        idList = all.map((img) => img.id)
        set((state) => ({
          imageIdListCache: { ...state.imageIdListCache, [projectId]: idList },
        }))
      }

      const idx = idList.findIndex((id) => id === currentImageId)
      const prevIndex = idx >= 0 ? idx - 1 : -1
      const hasPrevious = prevIndex >= 0
      const prevId = hasPrevious ? idList[prevIndex] : ""

      // prefetch previous window (lazy): fetch up to 10 images ending at prevIndex
      if (hasPrevious) {
        const end = prevIndex
        const limit = 10
        const start = Math.max(0, end - (limit - 1))
        try {
          const images = await data.fetchImageDataRange(projectId, start, limit)
          const projectCache = imageDataCache[projectId] || {}
          images.forEach((img) => (projectCache[img.id] = img))
          set((state) => ({
            imageDataCache: {
              ...state.imageDataCache,
              [projectId]: projectCache,
            },
          }))
        } catch {
          // ignore
        }
      }

      return { id: prevId, hasPrevious }
    },

    nextImage: { id: "", hasNext: false },
    previousImage: { id: "", hasPrevious: false },
  }))
)
