import { memo, useCallback, useMemo, useState } from "react"
import { FileText, HelpCircle, Loader2 } from "lucide-react"
import {
  annotationsToSpans,
  annotationsToRelations,
  annotationsToValue,
} from "@/lib/text-spans"
import { useClassification } from "@/components/studio/common/use-classification"
import type { Label } from "@/types/core"
import type { EditorProps } from "./types"
import { useDocumentText } from "./text/use-document-text"
import { SpanDocument } from "./text/span-document"
import { EntityList } from "./text/entity-list"
import { RelationPanel } from "./text/relation-panel"
import { ClassChoices } from "./text/class-choices"
import { TranslationPane } from "./text/translation-pane"
import { FloatingLabelMenu } from "./text/floating-label-menu"

interface PendingRelation {
  fromId: string
  toId: string
  x: number
  y: number
}

// Text modality editor. One body for every text task; the interaction layer
// switches on `capabilities.task`:
//   ner / question_answering / relation_extraction → character-span selection
//   text_classification (single) / taxonomy (multi) → whole-document classes
//   translation → source pane + target textarea
export const TextEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const doc = viewModel.data.image
  const { annotations, labels } = viewModel.data
  const { text, error } = useDocumentText(doc?.path, doc?.id)
  const classification = useClassification(viewModel)

  const task = capabilities.task
  const isRelation = task === "relation_extraction"
  const isQA = task === "question_answering"
  const isSpanTask = task === "ner" || isQA || isRelation
  const isClassTask = task === "text_classification" || task === "taxonomy"
  const isMultiClass = task === "taxonomy"
  const isTranslation = task === "translation"

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

  // Q&A: surface a leading "Q: …" line as the question to answer.
  const question = useMemo(() => {
    if (!isQA || text == null) return null
    const firstLine = text.split("\n", 1)[0] ?? ""
    return /^\s*Q:/i.test(firstLine)
      ? firstLine.replace(/^\s*Q:\s*/i, "").trim()
      : null
  }, [isQA, text])

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

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted">
        <p className="text-muted-foreground">No documents in this project</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      {/* Document header + task hint */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-sm">
        <FileText className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium" title={doc.name}>
          {doc.name}
        </span>
        {isSpanTask && (
          <span className="text-xs text-muted-foreground">
            {isRelation
              ? "Select text to add entities · click two entities to link them"
              : isQA
                ? "Select the answer in the text"
                : "Select text to label an entity"}
          </span>
        )}
      </div>

      {question && (
        <div className="flex items-start gap-2 border-b border-border bg-primary/5 px-4 py-2 text-sm">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="font-medium">{question}</span>
        </div>
      )}

      {/* Document pane */}
      {error ? (
        <p className="px-6 py-5 text-sm text-destructive">{error}</p>
      ) : text == null ? (
        <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading document…
        </div>
      ) : (
        <SpanDocument
          text={text}
          spans={isSpanTask ? spans : []}
          labels={labels}
          activeLabelId={viewModel.activeLabelId}
          interactive={isSpanTask}
          onCreateSpan={createSpan}
          onDeleteSpan={viewModel.deleteAnnotation}
          onEntityClick={isRelation ? startOrCompleteLink : undefined}
          linkingId={linkingId}
        />
      )}

      {/* Task-specific side panels */}
      {isSpanTask && (
        <EntityList
          spans={spans}
          onDelete={viewModel.deleteAnnotation}
          onLink={isRelation ? (id) => setLinkingId(id) : undefined}
          linkingId={linkingId}
        />
      )}

      {isRelation && (
        <RelationPanel
          relations={relations}
          spans={spans}
          linkingId={linkingId}
          onDelete={viewModel.deleteAnnotation}
        />
      )}

      {isTranslation && (
        <TranslationPane value={value} onCommit={commitTranslation} />
      )}

      {isClassTask && (
        <ClassChoices
          labels={labels}
          selected={classification.selectedNames}
          multiple={isMultiClass}
          title={isMultiClass ? "Document tags" : "Document class"}
          onToggle={(label) =>
            isMultiClass
              ? void classification.toggle(label)
              : classification.selectedNames.has(label.name)
                ? void classification.clear()
                : void classification.assign(label)
          }
          onClear={() => void classification.clear()}
        />
      )}

      {/* Relation type picker (after a pair is chosen) */}
      {pendingRelation && (
        <FloatingLabelMenu
          x={pendingRelation.x}
          y={pendingRelation.y}
          labels={labels}
          activeLabelId={viewModel.activeLabelId}
          emptyHint="Add a class to use as a relation type."
          onPick={createRelation}
          onDismiss={() => setPendingRelation(null)}
        />
      )}
    </div>
  )
})

TextEditor.displayName = "TextEditor"
