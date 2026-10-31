import { memo } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { Item } from "@/shared/types/core"
import type { ObjectTag } from "@/shared/lib/label-config/types"
import {
  parseListEntries,
  parseUtterances,
} from "@/features/studio/model/lib/structured-fields"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"
import { useMediaUrl } from "./media-source"
import { ChatView, DialogueView, ListView } from "./dialogue-views"

/**
 * Read-only data-bound panels rendered above the interactive viewer — the
 * prompt + model responses of an LLM-eval task, the query + candidate documents
 * of a retrieval task, the images of a multi-image task. Each field resolves
 * from the item's inline row data (`item.data[field]`, populated by the
 * spreadsheet import): text is shown as-is, an image field holds a path or URL.
 * Text falls back to a file read for path-backed documents.
 */
export const ContextObjects = memo(
  ({
    objects,
    doc,
    grow = false,
  }: {
    objects: ObjectTag[]
    doc: Item
    /** When these panels are the only content (no interactive viewer), let them
     *  fill the editor; otherwise cap their height above the viewer. */
    grow?: boolean
  }) => {
    if (objects.length === 0) return null
    return (
      <div
        className={cn(
          // Images sit side by side; text fields always take the full row.
          "grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] content-start gap-3 overflow-auto border-b border-border bg-muted/20 px-6 py-3",
          grow ? "min-h-0 flex-1" : "max-h-[45%] shrink-0"
        )}
      >
        {objects.map((object) =>
          object.tag === "image" ? (
            <ContextImage key={object.name} object={object} doc={doc} />
          ) : (
            <ContextField key={object.name} object={object} doc={doc} />
          )
        )}
      </div>
    )
  }
)

ContextObjects.displayName = "ContextObjects"

const PanelTitle = ({ object }: { object: ObjectTag }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {object.attrs.title || object.name}
  </span>
)

/** Structured fields render with their own view; plain text as-is. */
function renderField(object: ObjectTag, text: string) {
  switch (object.tag) {
    case "paragraphs":
      return (
        <DialogueView
          utterances={parseUtterances(text, object.attrs.namekey, object.attrs.textkey)}
        />
      )
    case "chat":
      return <ChatView messages={parseUtterances(text, "role", "content")} />
    case "list":
      return <ListView entries={parseListEntries(text)} />
    default:
      return text
  }
}

const ContextField = memo(
  ({ object, doc }: { object: ObjectTag; doc: Item }) => {
    const { text, error } = useDocumentText(
      doc.path,
      doc.id,
      inlineFieldText(doc, object.valueKey)
    )

    return (
      <div className="col-span-full flex flex-col gap-1">
        <PanelTitle object={object} />
        <div className="whitespace-pre-wrap rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : text == null ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </span>
          ) : text.trim() === "" ? (
            <span className="italic text-muted-foreground">(empty)</span>
          ) : (
            renderField(object, text)
          )}
        </div>
      </div>
    )
  }
)

ContextField.displayName = "ContextField"

const ContextImage = memo(
  ({ object, doc }: { object: ObjectTag; doc: Item }) => {
    // Only the row's own field counts — never fall back to the item's file.
    const field = doc.data?.[object.valueKey]
    const hasImage = typeof field === "string" && field.trim() !== ""
    const url = useMediaUrl(doc, object.valueKey)
    return (
      <figure className="flex flex-col gap-1">
        <figcaption>
          <PanelTitle object={object} />
        </figcaption>
        {hasImage ? (
          <img
            src={url}
            alt={object.attrs.title || object.name}
            className="max-h-72 w-full rounded-md border border-border bg-background object-contain"
          />
        ) : (
          <span className="rounded-md border border-border bg-background px-3 py-2 text-sm italic text-muted-foreground">
            (no image)
          </span>
        )}
      </figure>
    )
  }
)

ContextImage.displayName = "ContextImage"
