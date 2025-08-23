import { Annotation, ImageData as ImageModal } from "@vailabel/core"
import { create } from "zustand"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { exceptionMiddleware } from "@/hooks/exception-middleware"

export type AnnotationsStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void
  annotations: Annotation[]
  fetchAnnotations: (projectId: string) => Promise<Annotation[]>
  getAnnotationsByImageId: (imageId: string) => Promise<Annotation[]>
  setAnnotations: (annotations: Annotation[]) => void
  createAnnotation: (annotation: Annotation) => Promise<void>
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  currentImage: ImageModal | null
  setCurrentImage: (image: ImageModal | null) => void
}

export const useAnnotationsStore = create<AnnotationsStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),
    annotations: [],
    getAnnotationsByImageId: async (imageId: string) => {
      const { data } = get()
      return await data.getAnnotationsByImageId(imageId).then((annotations) => {
        set({ annotations })
        return annotations
      })
    },
    fetchAnnotations: async (projectId: string) => {
      const { data } = get()
      const annotations = await data.fetchAnnotations(projectId)
      set({ annotations })
      return annotations
    },
    setAnnotations: (annotations) => set({ annotations }),
    createAnnotation: async (annotation: Annotation) => {
      const { data } = get()

      return await data.saveAnnotation(annotation).then(() => {
        set((state) => ({
          annotations: [...state.annotations, annotation],
        }))
      })
    },
    updateAnnotation: async (id: string, updates: Partial<Annotation>) => {
      const { data } = get()
      console.log("Updating annotation in store:", id, updates)
      await data.updateAnnotation(id, updates)

      // Update local state to reflect changes immediately
      set((state) => ({
        annotations: state.annotations.map((annotation) =>
          annotation.id === id ? { ...annotation, ...updates } : annotation
        ),
      }))
    },
    deleteAnnotation: async (id: string) => {
      const { data } = get()
      // delete the annotation from the local state
      set((state) => ({
        annotations: state.annotations.filter(
          (annotation) => annotation.id !== id
        ),
      }))
      return await data.deleteAnnotation(id)
    },
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
    currentImage: null,
    setCurrentImage: (image: ImageModal | null) => set({ currentImage: image }),
  }))
)
