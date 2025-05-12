import { createContext, useContext, useCallback, useState } from "react"
import type { Annotation, ImageData } from "@/lib/types"

type AnnotationsContextType = {
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

const AnnotationsContext = createContext<AnnotationsContextType | null>(null)

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
    (annotation: Annotation) => {
      const newAnnotations = [...annotations, annotation]
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [annotations, addHistoryEntry]
  )

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      const newAnnotations = annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates, updatedAt: new Date() } : ann
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [annotations, addHistoryEntry]
  )

  const deleteAnnotation = useCallback(
    (id: string) => {
      const newAnnotations = annotations.filter((ann) => ann.id !== id)
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [annotations, addHistoryEntry]
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

export const useAnnotations = () => {
  const context = useContext(AnnotationsContext)
  if (!context)
    throw new Error("useAnnotations must be used within AnnotationsProvider")
  return context
}
