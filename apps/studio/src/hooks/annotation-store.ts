import { Annotation, ImageData as ImageModal } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"

type AnnotationsContextType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void
  annotations: Annotation[]
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
  setSelectedAnnotation: (annotation: Annotation | null) => void
  selectedAnnotation: Annotation | null
}

export const useAnnotationsStore = create<AnnotationsContextType>(
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
    setAnnotations: (annotations) => set({ annotations }),
    createAnnotation: async (annotation: Annotation) => {
      const { data } = get()
      return await data.saveAnnotation(annotation)
    },
    updateAnnotation: async (id: string, updates: Partial<Annotation>) => {
      const { data } = get()
      return await data.updateAnnotation(id, updates)
    },
    deleteAnnotation: async (id: string) => {
      const { data } = get()
      return await data.deleteAnnotation(id)
    },
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
    currentImage: null,
    setCurrentImage: (image: ImageModal | null) => set({ currentImage: image }),
    setSelectedAnnotation: (annotation: Annotation | null) =>
      set({ selectedAnnotation: annotation }),
    selectedAnnotation: null,
  }))
)
