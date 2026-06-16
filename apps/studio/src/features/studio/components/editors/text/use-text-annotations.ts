import { useCallback, useMemo, useState } from "react"
import {
  annotationsToSpans,
  annotationsToRelations,
  annotationsToValue,
} from "@/features/studio/model/lib/text-spans"
import type { Label } from "@/shared/types/core"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

interface PendingRelation {
  fromId: string
  toId: string
  x: number
  y: number
}

/**
 * Owns the text editor's annotation reads and writes: the derived span / relation
 * / value views, the entity-linking interaction state, and the create handlers
 * for spans, relations, and the translation value. The editor body stays a thin
 * renderer that wires these to the task-specific panels.
 */
export function useTextAnnotations(viewModel: StudioScreenViewModel) {
  const { annotations } = viewModel.data
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [pendingRelation, setPendingRelation] = useState<PendingRelation | null>(
    null
  )

  const spans = useMemo(() => annotationsToSpans(annotations), [annotations])
  const relations = useMemo(
    () => annotationsToRelations(annotations),
    [annotations]
  )
  const value = useMemo(() => annotationsToValue(annotations), [annotations])

  const createSpan = useCallback(
    (start: number, end: number, quote: string, label: Label) => {
      viewModel.setActiveLabelId(label.id)
      void viewModel.createAnnotationFromDraft({
        name: label.name,
        color: label.color,
        type: "span",
        coordinates: [],
        labelId: label.id,
        meta: { kind: "text", charStart: start, charEnd: end, quote },
      })
    },
    [viewModel]
  )

  // Click an entity to start a link; click a second to choose where the relation
  // type picker pops up; clicking the same entity cancels.
  const startOrCompleteLink = useCallback(
    (entityId: string, event: React.MouseEvent) => {
      if (!linkingId) {
        setLinkingId(entityId)
        return
      }
      if (linkingId === entityId) {
        setLinkingId(null)
        return
      }
      setPendingRelation({
        fromId: linkingId,
        toId: entityId,
        x: event.clientX,
        y: event.clientY + 6,
      })
      setLinkingId(null)
    },
    [linkingId]
  )

  const createRelation = useCallback(
    (label: Label) => {
      if (!pendingRelation) return
      void viewModel.createAnnotationFromDraft({
        name: label.name,
        color: label.color,
        type: "relation",
        coordinates: [],
        labelId: label.id,
        meta: {
          kind: "relation",
          fromId: pendingRelation.fromId,
          toId: pendingRelation.toId,
        },
      })
      setPendingRelation(null)
    },
    [pendingRelation, viewModel]
  )

  const commitTranslation = useCallback(
    (next: string) => {
      const existing = annotations.find((entry) => entry.meta?.kind === "value")
      if (existing) {
        void viewModel.updateAnnotation(existing.id, {
          meta: { kind: "value", text: next },
        })
      } else {
        void viewModel.createAnnotationFromDraft({
          name: "translation",
          color: "#64748b",
          type: "translation",
          coordinates: [],
          meta: { kind: "value", text: next },
        })
      }
    },
    [annotations, viewModel]
  )

  return {
    spans,
    relations,
    value,
    linkingId,
    setLinkingId,
    pendingRelation,
    clearPendingRelation: useCallback(() => setPendingRelation(null), []),
    createSpan,
    startOrCompleteLink,
    createRelation,
    commitTranslation,
  }
}
