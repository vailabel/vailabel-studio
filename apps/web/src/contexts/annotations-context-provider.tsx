import { useCallback, useEffect, useState } from "react"
import { AnnotationsContext } from "./annotations-context"
import type { Annotation, ImageData, Label } from "@/lib/types"
import { useDataAccess } from "@/hooks/use-data-access"

export type AnnotationsContextType = {
  annotations: Annotation[]
  createAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  createLabel: (label: Label, annotationIds: string[]) => void
  updateLabel: (id: string, updates: Partial<Label>) => void
  deleteLabel: (id: string) => void
  getOrCreateLabel: (name: string, color: string) => Promise<Label>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  currentImage: ImageData | null
  setCurrentImage: (image: ImageData | null) => void
  setSelectedAnnotation: (annotation: Annotation | null) => void
  selectedAnnotation: Annotation | null
  labels: Label[]
  setLabels: React.Dispatch<React.SetStateAction<Label[]>>
}

const MAX_HISTORY = 100

export const AnnotationsProvider = ({ children }: { children: React.ReactNode }) => {
  const dataAccess = useDataAccess()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null)

  const [currentImage, setCurrentImage] = useState<ImageData | null>(null)
  const [labels, setLabels] = useState<Label[]>([])
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
    [currentImage, addHistoryEntry, dataAccess]
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
    [currentImage, addHistoryEntry, dataAccess]
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
    [currentImage, addHistoryEntry, dataAccess]
  )

  const createLabel = useCallback(
    async (label: Label, annotationIds: string[]) => {
      await dataAccess.createLabel(label, annotationIds)
      const newAnnotations = await dataAccess.getAnnotations(
        currentImage?.id || ""
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [currentImage, addHistoryEntry, dataAccess]
  )

  const updateLabel = useCallback(
    async (id: string, updates: Partial<Label>) => {
      await dataAccess.updateLabel(id, updates)
      const newAnnotations = await dataAccess.getAnnotations(
        currentImage?.id || ""
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [currentImage, addHistoryEntry, dataAccess]
  )

  const deleteLabel = useCallback(
    async (id: string) => {
      await dataAccess.deleteLabel(id)
      const newAnnotations = await dataAccess.getAnnotations(
        currentImage?.id || ""
      )
      setAnnotations(newAnnotations)
      addHistoryEntry(newAnnotations)
    },
    [currentImage, addHistoryEntry, dataAccess]
  )

  const getOrCreateLabel = useCallback(
    async (name: string, color: string) => {
      // Check if the label already exists
      const existingLabels = await dataAccess.getLabels()
      let label = existingLabels.find(
        (lbl) => lbl.name === name && lbl.color === color
      )
      if (!label) {
        // Create a new label if it doesn't exist
        label = { id: crypto.randomUUID(), name, color } as Label
        await dataAccess.createLabel(label, [])
      }
      return label
    },
    [dataAccess]
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

  useEffect(() => {
    dataAccess.getLabels().then((labels) => {
      setLabels(labels)
    })
    dataAccess
      .getAnnotations(currentImage?.id ?? "")
      .then((annotations) => {
        setAnnotations(annotations)
      })
      .catch((error) => {
        console.error("Error fetching annotations:", error)
      })
  }, [currentImage, dataAccess, setCurrentImage])
  return (
    <AnnotationsContext.Provider
      value={{
        labels,
        setLabels,
        annotations,
        createAnnotation,
        updateAnnotation,
        getOrCreateLabel,
        createLabel,
        updateLabel,
        deleteLabel,
        deleteAnnotation,
        undo,
        redo,
        canUndo,
        canRedo,
        currentImage,
        setCurrentImage,
        setSelectedAnnotation,
        selectedAnnotation
      }}
    >
      {children}
    </AnnotationsContext.Provider>
  )
}
