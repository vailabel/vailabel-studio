import { create } from "zustand"
import { db } from "./db"
import type { Project, Label, ImageData, Annotation } from "./types"

interface HistoryItem {
  labels: Label[]
  images: ImageData[]
  annotations: Annotation[]
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  labels: Label[]
  images: ImageData[]
  annotations: Annotation[]
  history: HistoryItem[]
  historyIndex: number

  // Project management
  createProject: (project: Omit<Project, "id">) => Promise<void>
  loadProject: (projectId: string) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>

  // Label operations
  createLabel: (label: Omit<Label, "id" | "projectId">) => Promise<void>
  updateLabel: (labelId: string, updates: Partial<Label>) => Promise<void>
  deleteLabel: (labelId: string) => Promise<void>

  // Image operations
  addImage: (image: Omit<ImageData, "id" | "projectId">) => Promise<void>
  removeImage: (imageId: string) => Promise<void>

  // Annotation operations
  createAnnotation: (annotation: Omit<Annotation, "id">) => Promise<void>
  updateAnnotation: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<void>
  deleteAnnotation: (annotationId: string) => Promise<void>

  // History operations
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean

  // Private methods
  _captureState: () => HistoryItem
  _applyState: (state: HistoryItem) => Promise<void>
}

export const useStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  labels: [],
  images: [],
  annotations: [],
  history: [],
  historyIndex: -1,

  // Private methods
  _captureState: () => ({
    labels: [...get().labels],
    images: [...get().images],
    annotations: [...get().annotations],
  }),

  _applyState: async (state) => {
    const { currentProject } = get()
    if (!currentProject) return

    // Update database transactions
    await db.transaction(
      "rw",
      db.labels,
      db.images,
      db.annotations,
      async () => {
        // Update labels
        const currentLabels = await db.labels
          .where("projectId")
          .equals(currentProject.id)
          .toArray()
        await Promise.all(
          currentLabels.map((label) => db.labels.delete(label.id))
        )
        await db.labels.bulkAdd(state.labels)

        // Update images
        const currentImages = await db.images
          .where("projectId")
          .equals(currentProject.id)
          .toArray()
        await Promise.all(
          currentImages.map((image) => db.images.delete(image.id))
        )
        await db.images.bulkAdd(state.images)

        // Update annotations
        const imageIds = state.images.map((i) => i.id)
        const currentAnnotations = await db.annotations
          .where("imageId")
          .anyOf(imageIds)
          .toArray()
        await Promise.all(
          currentAnnotations.map((ann) => db.annotations.delete(ann.id))
        )
        await db.annotations.bulkAdd(state.annotations)
      }
    )

    set({
      labels: state.labels,
      images: state.images,
      annotations: state.annotations,
    })
  },

  // Project management
  createProject: async (project) => {
    const id = crypto.randomUUID()
    const newProject = { ...project, id }
    await db.projects.add(newProject)
    set((state) => ({ projects: [...state.projects, newProject] }))
  },

  loadProject: async (projectId) => {
    try {
      const project = await db.projects.get(projectId)
      if (!project) {
        console.error("Project not found:", projectId)
        return
      }

      // Get all related image IDs first
      const imageIds = await db.images
        .where("projectId")
        .equals(projectId)
        .primaryKeys()

      // Parallel fetch of all related data
      const [labels, images, annotations] = await Promise.all([
        db.labels.where("projectId").equals(projectId).toArray(),
        db.images.where("projectId").equals(projectId).toArray(),
        db.annotations.where("imageId").anyOf(imageIds).toArray(),
      ])

      const initialState: HistoryItem = {
        labels: [...labels],
        images: [...images],
        annotations: [...annotations],
      }

      // Reset state with proper type safety
      set({
        currentProject: project,
        labels,
        images,
        annotations,
        history: [initialState], // Initialize fresh history stack
        historyIndex: 0, // Reset to initial state
      })
    } catch (error) {
      console.error("Failed to load project:", error)
      // Consider adding error state handling
    }
  },

  deleteProject: async (projectId) => {
    await db.transaction(
      "rw",
      db.projects,
      db.labels,
      db.images,
      db.annotations,
      async () => {
        await db.projects.delete(projectId)
        await db.labels.where("projectId").equals(projectId).delete()
        const imageIds = await db.images
          .where("projectId")
          .equals(projectId)
          .primaryKeys()
        await db.images.where("projectId").equals(projectId).delete()
        await db.annotations.where("imageId").anyOf(imageIds).delete()
      }
    )

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      currentProjectId:
        state.currentProject?.id === projectId
          ? null
          : state.currentProject?.id,
    }))
  },

  // Label operations
  createLabel: async (label) => {
    const { currentProject, _captureState } = get()
    if (!currentProject) return

    const newLabel = {
      ...label,
      id: crypto.randomUUID(),
      projectId: currentProject?.id,
    }
    const prevState = _captureState()

    await db.labels.add(newLabel)
    const newState = { ...prevState, labels: [...prevState.labels, newLabel] }

    set((state) => ({
      labels: newState.labels,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  updateLabel: async (labelId, updates) => {
    const { labels, _captureState } = get()
    const prevState = _captureState()

    const updatedLabels = labels.map((label) =>
      label.id === labelId ? { ...label, ...updates } : label
    )

    await db.labels.update(labelId, updates)
    const newState = { ...prevState, labels: updatedLabels }

    set((state) => ({
      labels: updatedLabels,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  deleteLabel: async (labelId) => {
    const { labels, _captureState } = get()
    const prevState = _captureState()

    const updatedLabels = labels.filter((label) => label.id !== labelId)
    await db.labels.delete(labelId)
    const newState = { ...prevState, labels: updatedLabels }

    set((state) => ({
      labels: updatedLabels,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  // Image operations
  addImage: async (image) => {
    const { currentProject, _captureState } = get()
    if (!currentProject) return

    const newImage = {
      ...image,
      id: crypto.randomUUID(),
      projectId: currentProject.id,
    }
    const prevState = _captureState()

    await db.images.add(newImage)
    const newState = { ...prevState, images: [...prevState.images, newImage] }

    set((state) => ({
      images: newState.images,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  removeImage: async (imageId) => {
    const { images, annotations, _captureState } = get()
    const prevState = _captureState()

    const updatedImages = images.filter((img) => img.id !== imageId)
    const updatedAnnotations = annotations.filter(
      (ann) => ann.imageId !== imageId
    )

    await db.transaction("rw", db.images, db.annotations, async () => {
      await db.images.delete(imageId)
      await db.annotations.where("imageId").equals(imageId).delete()
    })

    const newState = {
      ...prevState,
      images: updatedImages,
      annotations: updatedAnnotations,
    }

    set((state) => ({
      images: updatedImages,
      annotations: updatedAnnotations,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  // Annotation operations
  createAnnotation: async (annotation) => {
    const { annotations, _captureState } = get()
    const prevState = _captureState()

    const newAnnotation = { ...annotation, id: crypto.randomUUID() }
    await db.annotations.add(newAnnotation)
    const newState = {
      ...prevState,
      annotations: [...annotations, newAnnotation],
    }

    set((state) => ({
      annotations: newState.annotations,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  updateAnnotation: async (annotationId, updates) => {
    const { annotations, _captureState } = get()
    const prevState = _captureState()

    const updatedAnnotations = annotations.map((ann) =>
      ann.id === annotationId ? { ...ann, ...updates } : ann
    )

    await db.annotations.update(annotationId, updates)
    const newState = { ...prevState, annotations: updatedAnnotations }

    set((state) => ({
      annotations: updatedAnnotations,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  deleteAnnotation: async (annotationId) => {
    const { annotations, _captureState } = get()
    const prevState = _captureState()

    const updatedAnnotations = annotations.filter(
      (ann) => ann.id !== annotationId
    )
    await db.annotations.delete(annotationId)
    const newState = { ...prevState, annotations: updatedAnnotations }

    set((state) => ({
      annotations: updatedAnnotations,
      history: [...state.history.slice(0, state.historyIndex + 1), newState],
      historyIndex: state.historyIndex + 1,
    }))
  },

  // History operations
  undo: async () => {
    const { history, historyIndex, _applyState } = get()
    if (historyIndex <= 0) return

    const prevState = history[historyIndex - 1]
    await _applyState(prevState)

    set({ historyIndex: historyIndex - 1 })
  },

  redo: async () => {
    const { history, historyIndex, _applyState } = get()
    if (historyIndex >= history.length - 1) return

    const nextState = history[historyIndex + 1]
    await _applyState(nextState)

    set({ historyIndex: historyIndex + 1 })
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}))
