import { Annotation, ImageData as ImageModal } from "@vailabel/core"
import { IDBContext } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

type AnnotationsContextType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
  annotations: Annotation[]
  getAnnotationsByImageId: (imageId: string) => Annotation[]
  setAnnotations: (annotations: Annotation[]) => void
  createAnnotation: (annotation: Annotation) => Promise<void>
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  currentImage: ImageModal | null
  setCurrentImage: (image: ImageModal | null) => void
  setSelectedAnnotation: (annotation: Annotation | null) => void
  selectedAnnotation: Annotation | null
}

export const useAnnotationsStore = create<AnnotationsContextType>(
  exceptionMiddleware((set, get) => ({
    dbContext: {} as IDBContext,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    annotations: [],
    setAnnotations: (annotations) => set({ annotations }),
    getAnnotationsByImageId: (imageId) => {
      const { dbContext, annotations } = get()
      dbContext.annotations.get().then((allAnnotations: Annotation[]) => {
        set({ annotations: allAnnotations })
      })

      return annotations.filter((annotation) => annotation.imageId === imageId)
    },
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
  }))
)
