import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Annotation } from "@/types/core"
import type { AnnotationMeta } from "@/types/modality"
import type { CanvasHistoryEntry, CanvasSessionState } from "./types"

interface CreateAnnotationDraftInput {
  name: string
  color: string
  type: string
  coordinates: Array<{ x: number; y: number }>
  labelId?: string
  meta?: AnnotationMeta
}

interface UseCanvasSessionOptions {
  annotations: Annotation[]
  selectedAnnotation: Annotation | null
  setSelectedAnnotation: (annotation: Annotation | null) => void
  createAnnotation: (annotation: Partial<Annotation>) => Promise<Annotation>
  createAnnotationFromDraft: (
    draft: CreateAnnotationDraftInput
  ) => Promise<Annotation>
  updateAnnotation: (
    annotationId: string,
    updates: Partial<Annotation>
  ) => Promise<Annotation>
  deleteAnnotation: (annotationId: string) => Promise<void>
}

function cloneAnnotation(annotation: Annotation | null): Annotation | null {
  if (!annotation) return null

  return {
    ...annotation,
    coordinates: annotation.coordinates.map((point) => ({ ...point })),
  }
}

function historyLabel(kind: CanvasHistoryEntry["kind"], annotation: Annotation | null) {
  const name = annotation?.name || "annotation"
  switch (kind) {
    case "create":
      return `Create ${name}`
    case "update":
      return `Update ${name}`
    case "delete":
      return `Delete ${name}`
  }
}

function toUpdatePayload(annotation: Annotation) {
  const { id: _ignoredId, ...updates } = cloneAnnotation(annotation) as Annotation
  return updates
}

export function useCanvasSession({
  annotations,
  selectedAnnotation,
  setSelectedAnnotation,
  createAnnotation,
  createAnnotationFromDraft,
  updateAnnotation,
  deleteAnnotation,
}: UseCanvasSessionOptions) {
  const [past, setPast] = useState<CanvasHistoryEntry[]>([])
  const [future, setFuture] = useState<CanvasHistoryEntry[]>([])
  const applyingHistoryRef = useRef(false)

  // Latest-value refs so the commit callbacks below can look up the current
  // annotation / selection WITHOUT listing them as deps. That keeps
  // updateAnnotation/deleteAnnotation referentially stable across data changes —
  // they're handed to every shape as a prop, so a stable identity is what lets the
  // per-shape memo skip unchanged shapes when a single annotation is edited.
  const annotationsRef = useRef(annotations)
  const selectedAnnotationRef = useRef(selectedAnnotation)
  useEffect(() => {
    annotationsRef.current = annotations
    selectedAnnotationRef.current = selectedAnnotation
  })

  const appendHistory = useCallback((entry: CanvasHistoryEntry) => {
    if (applyingHistoryRef.current) return
    setPast((current) => [...current, entry])
    setFuture([])
  }, [])

  const recordCreate = useCallback(
    (annotation: Annotation, label = historyLabel("create", annotation)) => {
      appendHistory({
        id: crypto.randomUUID(),
        annotationId: annotation.id,
        kind: "create",
        label,
        before: null,
        after: cloneAnnotation(annotation),
        createdAt: new Date().toISOString(),
      })
    },
    [appendHistory]
  )

  const recordDelete = useCallback(
    (annotation: Annotation, label = historyLabel("delete", annotation)) => {
      appendHistory({
        id: crypto.randomUUID(),
        annotationId: annotation.id,
        kind: "delete",
        label,
        before: cloneAnnotation(annotation),
        after: null,
        createdAt: new Date().toISOString(),
      })
    },
    [appendHistory]
  )

  const commitCreateAnnotationFromDraft = useCallback(
    async (draft: CreateAnnotationDraftInput) => {
      const createdAnnotation = await createAnnotationFromDraft(draft)
      recordCreate(createdAnnotation)
      setSelectedAnnotation(createdAnnotation)
      return createdAnnotation
    },
    [createAnnotationFromDraft, recordCreate, setSelectedAnnotation]
  )

  const commitUpdateAnnotation = useCallback(
    async (annotationId: string, updates: Partial<Annotation>) => {
      const currentAnnotation =
        annotationsRef.current.find(
          (annotation) => annotation.id === annotationId
        ) || null
      if (!currentAnnotation) {
        throw new Error(`Annotation ${annotationId} was not found.`)
      }

      const updatedAnnotation = await updateAnnotation(annotationId, updates)

      appendHistory({
        id: crypto.randomUUID(),
        annotationId,
        kind: "update",
        label: historyLabel("update", updatedAnnotation),
        before: cloneAnnotation(currentAnnotation),
        after: cloneAnnotation(updatedAnnotation),
        createdAt: new Date().toISOString(),
      })

      setSelectedAnnotation(updatedAnnotation)
      return updatedAnnotation
    },
    [appendHistory, setSelectedAnnotation, updateAnnotation]
  )

  const commitDeleteAnnotation = useCallback(
    async (annotationId: string) => {
      const currentAnnotation =
        annotationsRef.current.find(
          (annotation) => annotation.id === annotationId
        ) || null
      if (!currentAnnotation) {
        return
      }

      await deleteAnnotation(annotationId)
      recordDelete(currentAnnotation)

      if (selectedAnnotationRef.current?.id === annotationId) {
        setSelectedAnnotation(null)
      }
    },
    [deleteAnnotation, recordDelete, setSelectedAnnotation]
  )

  const applyHistoryEntry = useCallback(
    async (entry: CanvasHistoryEntry, direction: "undo" | "redo") => {
      applyingHistoryRef.current = true

      try {
        switch (entry.kind) {
          case "create":
            if (direction === "undo") {
              await deleteAnnotation(entry.annotationId)
              if (selectedAnnotation?.id === entry.annotationId) {
                setSelectedAnnotation(null)
              }
            } else if (entry.after) {
              const recreatedAnnotation = await createAnnotation(entry.after)
              setSelectedAnnotation(recreatedAnnotation)
            }
            break
          case "update":
            if (direction === "undo" && entry.before) {
              const restoredAnnotation = await updateAnnotation(
                entry.annotationId,
                toUpdatePayload(entry.before)
              )
              setSelectedAnnotation(restoredAnnotation)
            }
            if (direction === "redo" && entry.after) {
              const redoneAnnotation = await updateAnnotation(
                entry.annotationId,
                toUpdatePayload(entry.after)
              )
              setSelectedAnnotation(redoneAnnotation)
            }
            break
          case "delete":
            if (direction === "undo" && entry.before) {
              const restoredAnnotation = await createAnnotation(entry.before)
              setSelectedAnnotation(restoredAnnotation)
            }
            if (direction === "redo") {
              await deleteAnnotation(entry.annotationId)
              if (selectedAnnotation?.id === entry.annotationId) {
                setSelectedAnnotation(null)
              }
            }
            break
        }
      } finally {
        applyingHistoryRef.current = false
      }
    },
    [
      createAnnotation,
      deleteAnnotation,
      selectedAnnotation?.id,
      setSelectedAnnotation,
      updateAnnotation,
    ]
  )

  const undo = useCallback(async () => {
    const entry = past[past.length - 1]
    if (!entry) return

    setPast((current) => current.slice(0, -1))
    setFuture((current) => [entry, ...current])
    await applyHistoryEntry(entry, "undo")
  }, [applyHistoryEntry, past])

  const redo = useCallback(async () => {
    const [entry] = future
    if (!entry) return

    setFuture((current) => current.slice(1))
    setPast((current) => [...current, entry])
    await applyHistoryEntry(entry, "redo")
  }, [applyHistoryEntry, future])

  const sessionState = useMemo<CanvasSessionState>(
    () => ({
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      past,
      future,
    }),
    [future, past]
  )

  return {
    sessionState,
    canUndo: sessionState.canUndo,
    canRedo: sessionState.canRedo,
    historyPast: past,
    historyFuture: future,
    createAnnotationFromDraft: commitCreateAnnotationFromDraft,
    updateAnnotation: commitUpdateAnnotation,
    deleteAnnotation: commitDeleteAnnotation,
    undo,
    redo,
    recordExternalCreate: recordCreate,
    recordExternalDelete: recordDelete,
  }
}
