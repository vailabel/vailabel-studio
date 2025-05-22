import { create } from "zustand"
import type { IDBContext } from "@vailabel/core/src/data/sources/sqlite/SQLiteDBContext"
import {
  Project,
  Settings,
  AIModel,
  History,
  Annotation,
  ImageData as ImageModel,
  Label,
} from "@vailabel/core"

type ProjectsStoreState = {
  dbContext: IDBContext | null
  initDBContext: (ctx: IDBContext) => void
  projects: Project[]
  currentProject: Project | null
  images: ImageModel[]
  currentImage: ImageModel | null
  annotations: Annotation[]
  labels: Label[]
  settings: Settings[]
  aiModels: AIModel[]
  history: History[]

  // annotations
  setCurrentImage: (image: ImageModel | null) => void
  setAnnotations: (annotations: Annotation[]) => void

  // Labels
  setLabels: (labels: Label[]) => void
  getLabelsByProjectId: (projectId: string) => Promise<Label[]>

  getProjects: () => Promise<Project[]>
  getProjectById: (id: string) => Promise<Project | null>
  getProjectWithImages: (id: string) => Promise<Project | null>
  createProject: (project: Project) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  getImagesById: (imageId: string) => Promise<ImageModel | null>
  createImage: (image: ImageModel) => Promise<void>
  updateImage: (id: string, updates: Partial<ImageModel>) => Promise<void>
  deleteImage: (id: string) => Promise<void>

  getAnnotations: (imageId: string) => Promise<Annotation[]>
  getAnnotationsByImageId: (imageId: string) => Promise<Annotation[]>
  createAnnotation: (annotation: Annotation) => Promise<void>
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>

  getLabels: () => Promise<Label[]>
  getLabelById: (id: string) => Promise<Label | undefined>
  createLabel: (label: Label) => Promise<void>
  updateLabel: (id: string, updates: Partial<Label>) => Promise<void>
  deleteLabel: (id: string) => Promise<void>

  getSettings: () => Promise<Settings[]>
  getSetting: (key: string) => Promise<Settings | undefined>
  updateSetting: (key: string, value: string) => Promise<void>

  getHistory: () => Promise<void>
  updateHistory: (historyObj: History) => Promise<void>

  getAvailableModels: () => Promise<AIModel[]>
  uploadCustomModel: (file: AIModel) => Promise<void>
  selectModel: (modelId: string) => Promise<void>
  fetchSelectedModel: () => Promise<void>
  deleteModel: (modelId: string) => Promise<void>
}

export const useProjectsStore = create<ProjectsStoreState>((set, get) => ({
  dbContext: null,
  initDBContext: (ctx) => set({ dbContext: ctx }),
  projects: [],
  currentProject: null,
  images: [],
  currentImage: null,
  annotations: [],
  labels: [],
  settings: [],
  aiModels: [],
  history: [],

  setCurrentImage: (image) => set({ currentImage: image }),
  setAnnotations: (annotations) => set({ annotations }),
  setLabels: (labels) => set({ labels }),
  getLabelsByProjectId: async (projectId) => {
    try {
      const db = get().dbContext
      if (db) {
        const labels = (await db.labels.get()).filter(
          (label) => label.projectId === projectId
        )
        set({ labels })
      }
      return get().labels
    } catch (error) {
      console.error("getLabelsByProjectId error:", error)
      throw error
    }
  },

  getProjects: async () => {
    try {
      const db = get().dbContext
      if (db) {
        const projects = await db.projects.get()
        set({ projects })
      }
      return get().projects
    } catch (error) {
      console.error("getProjects error:", error)
      throw error
    }
  },
  getProjectById: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        const project = await db.projects.getById(id)
        set({ currentProject: project || null })
      }
      return get().currentProject
    } catch (error) {
      console.error("getProjectById error:", error)
      throw error
    }
  },
  getProjectWithImages: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        const project = await db.projects.getById(id)
        const images = db.images
          ? (await db.images.get()).filter((img) => img.projectId === id)
          : []
        if (project && project.id) {
          set({ currentProject: { ...project, images } as Project })
        } else {
          set({ currentProject: null })
        }
      }

      return get().currentProject
    } catch (error) {
      console.error("getProjectWithImages error:", error)
      throw error
    }
  },
  createProject: async (project) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.projects.create(project)
        await get().getProjects()
      }
    } catch (error) {
      console.error("createProject error:", error)
      throw error
    }
  },
  updateProject: async (id, updates) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.projects.update(id, updates)
        await get().getProjects()
      }
    } catch (error) {
      console.error("updateProject error:", error)
      throw error
    }
  },
  deleteProject: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.projects.delete(id)
        await get().getProjects()
      }
    } catch (error) {
      console.error("deleteProject error:", error)
      throw error
    }
  },
  getImages: async (projectId: string) => {
    try {
      const db = get().dbContext
      if (db) {
        const images = (await db.images.get()).filter(
          (img) => img?.projectId === projectId
        )
        set({ images })
      }
      return get().images
    } catch (error) {
      console.error("getImages error:", error)
      throw error
    }
  },
  getImagesById: async (imageId) => {
    try {
      const db = get().dbContext
      if (db) {
        const image = await db.images.getById(imageId)
        set({ currentImage: image || null })
      }
      return get().currentImage
    } catch (error) {
      console.error("getImagesById error:", error)
      throw error
    }
  },

  createImage: async (image) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.images.create(image)
        if (image.projectId) await db.images.getById(image.projectId)
      }
    } catch (error) {
      console.error("createImage error:", error)
      throw error
    }
  },
  updateImage: async (id, updates) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.images.update(id, updates)
        // Optionally refresh images if needed
      }
    } catch (error) {
      console.error("updateImage error:", error)
      throw error
    }
  },
  deleteImage: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.images.delete(id)
        // Optionally refresh images if needed
      }
    } catch (error) {
      console.error("deleteImage error:", error)
      throw error
    }
  },
  getAnnotations: async (imageId) => {
    try {
      const db = get().dbContext
      if (db) {
        const annotations = (await db.annotations.get()).filter(
          (a) => a.imageId === imageId
        )
        set({ annotations })
      }
      return get().annotations
    } catch (error) {
      console.error("getAnnotations error:", error)
      throw error
    }
  },
  getAnnotationsWithFilter: async (
    imageId: string,
    filter: Partial<Annotation>
  ) => {
    try {
      const db = get().dbContext
      if (db) {
        let annotations = (await db.annotations.get()).filter(
          (a) => a.imageId === imageId
        )
        for (const key in filter) {
          if (filter[key as keyof Annotation] !== undefined) {
            annotations = annotations.filter(
              (a) =>
                a[key as keyof Annotation] === filter[key as keyof Annotation]
            )
          }
        }
        set({ annotations })
      }
      return get().annotations
    } catch (error) {
      console.error("getAnnotationsWithFilter error:", error)
      throw error
    }
  },
  getAnnotationsByImageId: async (imageId) => {
    try {
      const db = get().dbContext
      if (db) {
        const annotations = (await db.annotations.get()).filter(
          (a) => a.imageId === imageId
        )
        set({ annotations })
      }
      return get().annotations
    } catch (error) {
      console.error("getAnnotationsByImageId error:", error)
      throw error
    }
  },
  createAnnotation: async (annotation) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.annotations.create(annotation)
        if (annotation.imageId) await get().getAnnotations(annotation.imageId)
      }
    } catch (error) {
      console.error("createAnnotation error:", error)
      throw error
    }
  },
  updateAnnotation: async (id, updates) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.annotations.update(id, updates)
        // Optionally refresh annotations if needed
      }
    } catch (error) {
      console.error("updateAnnotation error:", error)
      throw error
    }
  },
  deleteAnnotation: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.annotations.delete(id)
        // Optionally refresh annotations if needed
      }
    } catch (error) {
      console.error("deleteAnnotation error:", error)
      throw error
    }
  },
  getLabels: async () => {
    try {
      const db = get().dbContext
      if (db) {
        const labels = await db.labels.get()
        set({ labels })
      }
      return get().labels
    } catch (error) {
      console.error("getLabels error:", error)
      throw error
    }
  },
  getLabelById: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        const label = await db.labels.getById(id)
        return label === null ? undefined : label
      }
      return undefined
    } catch (error) {
      console.error("getLabelById error:", error)
      throw error
    }
  },
  createLabel: async (label) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.labels.create(label)
        await get().getLabels()
      }
    } catch (error) {
      console.error("createLabel error:", error)
      throw error
    }
  },
  updateLabel: async (id, updates) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.labels.update(id, updates)
        await get().getLabels()
      }
    } catch (error) {
      console.error("updateLabel error:", error)
      throw error
    }
  },
  deleteLabel: async (id) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.labels.delete(id)
        await get().getLabels()
      }
    } catch (error) {
      console.error("deleteLabel error:", error)
      throw error
    }
  },
  getSettings: async () => {
    try {
      const db = get().dbContext
      if (db) {
        const settings = await db.settings.get()
        set({ settings })
      }
      return get().settings
    } catch (error) {
      console.error("getSettings error:", error)
      throw error
    }
  },
  getSetting: async (key) => {
    try {
      const db = get().dbContext
      if (db) {
        const all = await db.settings.get()
        return all.find((s) => s.key === key)
      }
      return undefined
    } catch (error) {
      console.error("getSetting error:", error)
      throw error
    }
  },
  updateSetting: async (key, value) => {
    try {
      const db = get().dbContext
      if (db) {
        const all = await db.settings.get()
        const setting = all.find((s) => s.key === key)
        if (setting) {
          await db.settings.update(setting.key, { value })
          await get().getSettings()
        }
      }
    } catch (error) {
      console.error("updateSetting error:", error)
      throw error
    }
  },
  getHistory: async () => {
    try {
      const db = get().dbContext
      if (db) {
        const history = await db.history.get()
        set({ history })
      }
    } catch (error) {
      console.error("getHistory error:", error)
      throw error
    }
  },
  updateHistory: async (historyObj) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.history.update(historyObj.id, historyObj)
        await get().getHistory()
      }
    } catch (error) {
      console.error("updateHistory error:", error)
      throw error
    }
  },
  getAvailableModels: async () => {
    try {
      const db = get().dbContext
      if (db) {
        const aiModels = await db.aiModels.get()
        set({ aiModels })
      }
      return get().aiModels
    } catch (error) {
      console.error("getAvailableModels error:", error)
      throw error
    }
  },
  uploadCustomModel: async (file) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.aiModels.create(file)
        await get().getAvailableModels()
      }
    } catch (error) {
      console.error("uploadCustomModel error:", error)
      throw error
    }
  },
  selectModel: async (modelId) => {
    try {
      const db = get().dbContext
      if (db) {
        const model = await db.aiModels.getById(modelId)
        if (model) set({ aiModels: [model] })
      }
    } catch (error) {
      console.error("selectModel error:", error)
      throw error
    }
  },
  fetchSelectedModel: async () => {
    try {
      const db = get().dbContext
      if (db) {
        const aiModels = await db.aiModels.get()
        if (aiModels.length > 0) set({ aiModels: [aiModels[0]] })
      }
    } catch (error) {
      console.error("fetchSelectedModel error:", error)
      throw error
    }
  },
  deleteModel: async (modelId) => {
    try {
      const db = get().dbContext
      if (db) {
        await db.aiModels.delete(modelId)
        await get().getAvailableModels()
      }
    } catch (error) {
      console.error("deleteModel error:", error)
      throw error
    }
  },
}))
