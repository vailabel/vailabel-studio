import { createContext, useCallback, useState } from "react"
import type { Annotation, ImageData } from "@/lib/types"
import { getDataAccessLayer } from "@/lib/data-access"

const dataAccess = getDataAccessLayer(false) // Set to true to use API-based implementation

export type AnnotationsContextType = {
  annotations: Annotation[]
  createAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  currentImage: ImageData | null
  setCurrentImage: (image: ImageData | null) => void
  setSelectedAnnotation: (annotation: Annotation | null) => void
  selectedAnnotation: Annotation | null
}

export const AnnotationsContext = createContext<AnnotationsContextType | null>(
  null
)

const MAX_HISTORY = 100

export const AnnotationsProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null)
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null)

  const addHistoryEntry = useCallback(
    (newAnnotations: Annotation[]) => {
      const newHistory = history.slice(0, currentIndex + 1)
      newHistory.push(newAnnotations)
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      setHistory(newHistory)
      setCurrentIndex(newHistory.length - 1)
    },
    [history, currentIndex]
  )

  const createAnnotation = useCallback(
    async (annotation: Annotation) => {
      await dataAccess.createAnnotation(annotation)
      const newAnnotations = await dataAccess.getAnnotations(
        currentImage?.id || ""
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [currentImage, addHistoryEntry]
  )

  const updateAnnotation = useCallback(
    async (id: string, updates: Partial<Annotation>) => {
      await dataAccess.updateAnnotation(id, updates)
      const newAnnotations = await dataAccess.getAnnotations(
        currentImage?.id || ""
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [currentImage, addHistoryEntry]
  )

  const deleteAnnotation = useCallback(
    async (id: string) => {
      await dataAccess.deleteAnnotation(id)
      const newAnnotations = await dataAccess.getAnnotations(
        currentImage?.id || ""
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [currentImage, addHistoryEntry]
  )

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
    setAnnotations(history[currentIndex - 1])
  }, [currentIndex, history])

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1))
    setAnnotations(history[currentIndex + 1])
  }, [currentIndex, history])

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  return (
    <AnnotationsContext.Provider
      value={{
        annotations,
        createAnnotation,
        updateAnnotation,
        deleteAnnotation,
        undo,
        redo,
        canUndo,
        canRedo,
        currentImage,
        setCurrentImage,
        setSelectedAnnotation,
        selectedAnnotation,
      }}
    >
      {children}
    </AnnotationsContext.Provider>
  )
}
