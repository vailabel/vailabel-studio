import { Annotation, Label, ImageData as ImageModal } from "@vailabel/core"
import { IDBContext } from "@vailabel/core/src/data/sources/sqlite/SQLiteDBContext"
import { create } from "zustand"

type AnnotationsContextType = {
  dbContext: IDBContext | null
  initDBContext: (dbContext: IDBContext) => void
  annotations: Annotation[]
  setAnnotations: (annotations: Annotation[]) => void
  createAnnotation: (annotation: Annotation) => Promise<void>
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => Promise<void>
  createLabel: (label: Label, annotationIds: string[]) => Promise<void>
  updateLabel: (id: string, updates: Partial<Label>) => Promise<void>
  deleteLabel: (id: string) => Promise<void>
  getOrCreateLabel: (name: string, color: string) => Promise<Label>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  currentImage: ImageModal | null
  setCurrentImage: (image: ImageModal | null) => void
  setSelectedAnnotation: (annotation: Annotation | null) => void
  selectedAnnotation: Annotation | null
  labels: Label[]
  setLabels: (labels: Label[]) => void
}

export const useAnnotationsStore = create<AnnotationsContextType>(
  (set, get) => ({
    dbContext: null,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    annotations: [],
    setAnnotations: (annotations) => set({ annotations }),
    createAnnotation: async (annotation) => {
      const { annotations, dbContext } = get()
      set({ annotations: [...annotations, annotation] })
      if (dbContext) {
        await dbContext.annotations.create(annotation)
      }
    },
    updateAnnotation: async (id, updates) => {
      const { annotations, dbContext } = get()
      const updatedAnnotations = annotations.map((annotation) =>
        annotation.id === id ? { ...annotation, ...updates } : annotation
      )
      set({ annotations: updatedAnnotations })
      if (dbContext) {
        await dbContext.annotations.update(id, updates)
      }
    },
    deleteAnnotation: async (id) => {
      const { annotations, dbContext } = get()
      const updatedAnnotations = annotations.filter(
        (annotation) => annotation.id !== id
      )
      set({ annotations: updatedAnnotations })
      if (dbContext) {
        await dbContext.annotations.delete(id)
      }
    },
    createLabel: async (label, annotationIds) => {
      const { labels, annotations, dbContext } = get()
      const newLabel = { ...label, id: crypto.randomUUID() }
      const updatedLabels = [...labels, newLabel]
      set({ labels: updatedLabels })
      const updatedAnnotations = annotations.map((annotation) => {
        if (annotationIds.includes(annotation.id)) {
          return { ...annotation, labelId: newLabel.id }
        }
        return annotation
      })
      set({ annotations: updatedAnnotations })
      if (dbContext) {
        await dbContext.labels.create(newLabel)
        for (const annotation of updatedAnnotations) {
          await dbContext.annotations.update(annotation.id, annotation)
        }
      }
    },
    updateLabel: async (id, updates) => {
      const { labels, dbContext } = get()
      const updatedLabels = labels.map((label) =>
        label.id === id ? { ...label, ...updates } : label
      )
      set({ labels: updatedLabels })
      if (dbContext) {
        await dbContext.labels.update(id, updates)
      }
    },
    deleteLabel: async (id) => {
      const { labels, annotations, dbContext } = get()
      const updatedLabels = labels.filter((label) => label.id !== id)
      set({ labels: updatedLabels })
      const updatedAnnotations = annotations.map((annotation) => {
        if (annotation.labelId === id) {
          return { ...annotation, labelId: "" }
        }
        return annotation
      })
      set({ annotations: updatedAnnotations })
      if (dbContext) {
        await dbContext.labels.delete(id)
        for (const annotation of updatedAnnotations) {
          await dbContext.annotations.update(annotation.id, annotation)
        }
      }
    },
    getOrCreateLabel: async (name, color) => {
      const { labels, dbContext } = get()
      const existingLabel = labels.find((label) => label.name === name)
      if (existingLabel) {
        return existingLabel
      }
      // Fill all required Label fields
      const newLabel: Label = {
        id: crypto.randomUUID(),
        name,
        color,
        projectId: "", // Set appropriately if you have project context
        createdAt: new Date(),
        updatedAt: new Date(),
        category: "", // Set appropriately if needed
        isAIGenerated: false,
      }
      set({ labels: [...labels, newLabel] })
      if (dbContext) {
        await dbContext.labels.create(newLabel)
      }
      return newLabel
    },
    undo: () => {
      const { annotations, canUndo } = get()
      if (canUndo) {
        const lastAction = annotations.pop()
        set({ annotations, canUndo: false })
        if (lastAction) {
          set({ annotations: [...annotations, lastAction] })
        }
      }
    },
    redo: () => {
      const { annotations, canRedo } = get()
      if (canRedo) {
        const lastAction = annotations.pop()
        set({ annotations, canRedo: false })
        if (lastAction) {
          set({ annotations: [...annotations, lastAction] })
        }
      }
    },
    canUndo: false,
    canRedo: false,
    currentImage: null,
    setCurrentImage: (image) => set({ currentImage: image }),
    setSelectedAnnotation: (annotation) =>
      set({ selectedAnnotation: annotation }),
    selectedAnnotation: null,
    labels: [],
    setLabels: (labels) => set({ labels }),
  })
)
