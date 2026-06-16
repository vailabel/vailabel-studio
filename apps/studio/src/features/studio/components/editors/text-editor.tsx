import { memo, useMemo } from "react"
import { FileText, HelpCircle, Loader2 } from "lucide-react"
import { useClassification } from "@/features/studio/components/common/use-classification"
import type { EditorProps } from "./types"
import { useDocumentText } from "./text/use-document-text"
import { useTextAnnotations } from "./text/use-text-annotations"
import { textTaskFlags } from "./text/text-task"
import { SpanDocument } from "./text/span-document"
import { EntityList } from "./text/entity-list"
import { RelationPanel } from "./text/relation-panel"
import { ClassChoices } from "./text/class-choices"
import { TranslationPane } from "./text/translation-pane"
import { FloatingLabelMenu } from "./text/floating-label-menu"

// Text modality editor. One body for every text task; the interaction layer
// switches on `capabilities.task`:
//   ner / question_answering / relation_extraction → character-span selection
//   text_classification (single) / taxonomy (multi) → whole-document classes
//   translation → source pane + target textarea
export const TextEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const doc = viewModel.data.image
  const { labels } = viewModel.data
  const { text, error } = useDocumentText(doc?.path, doc?.id)
  const classification = useClassification(viewModel)
  const text$ = useTextAnnotations(viewModel)

  const { isRelation, isQA, isSpanTask, isClassTask, isMultiClass, isTranslation } =
    textTaskFlags(capabilities.task)

  // Q&A: surface a leading "Q: …" line as the question to answer.
  const question = useMemo(() => {
    if (!isQA || text == null) return null
    const firstLine = text.split("\n", 1)[0] ?? ""
    return /^\s*Q:/i.test(firstLine)
      ? firstLine.replace(/^\s*Q:\s*/i, "").trim()
      : null
  }, [isQA, text])

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
          spans={isSpanTask ? text$.spans : []}
          labels={labels}
          activeLabelId={viewModel.activeLabelId}
          interactive={isSpanTask}
          onCreateSpan={text$.createSpan}
          onDeleteSpan={viewModel.deleteAnnotation}
          onEntityClick={isRelation ? text$.startOrCompleteLink : undefined}
          linkingId={text$.linkingId}
        />
      )}

      {/* Task-specific side panels */}
      {isSpanTask && (
        <EntityList
          spans={text$.spans}
          onDelete={viewModel.deleteAnnotation}
          onLink={isRelation ? (id) => text$.setLinkingId(id) : undefined}
          linkingId={text$.linkingId}
        />
      )}

      {isRelation && (
        <RelationPanel
          relations={text$.relations}
          spans={text$.spans}
          linkingId={text$.linkingId}
          onDelete={viewModel.deleteAnnotation}
        />
      )}

      {isTranslation && (
        <TranslationPane value={text$.value} onCommit={text$.commitTranslation} />
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
      {text$.pendingRelation && (
        <FloatingLabelMenu
          x={text$.pendingRelation.x}
          y={text$.pendingRelation.y}
          labels={labels}
          activeLabelId={viewModel.activeLabelId}
          emptyHint="Add a class to use as a relation type."
          onPick={text$.createRelation}
          onDismiss={text$.clearPendingRelation}
        />
      )}
    </div>
  )
})

TextEditor.displayName = "TextEditor"
