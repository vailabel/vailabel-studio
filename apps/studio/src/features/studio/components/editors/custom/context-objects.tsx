import { memo } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { Item } from "@/shared/types/core"
import type { ObjectTag } from "@/shared/lib/label-config/types"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"

/**
 * Read-only data-bound text panels rendered above the interactive viewer — the
 * prompt + model responses of an LLM-eval task, the query + candidate documents
 * of a retrieval task, etc. Each field resolves from the item's inline row data
 * (`item.data[field]`, populated by the spreadsheet import) and falls back to a
 * file read for path-backed text documents.
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
          "flex flex-col gap-3 overflow-auto border-b border-border bg-muted/20 px-6 py-3",
          grow ? "min-h-0 flex-1" : "max-h-[45%] shrink-0"
        )}
      >
        {objects.map((object) => (
          <ContextField key={object.name} object={object} doc={doc} />
        ))}
      </div>
    )
  }
)

ContextObjects.displayName = "ContextObjects"

const ContextField = memo(
  ({ object, doc }: { object: ObjectTag; doc: Item }) => {
    const { text, error } = useDocumentText(
      doc.path,
      doc.id,
      inlineFieldText(doc, object.valueKey)
    )
    const title = object.attrs.title || object.name

    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
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
            text
          )}
        </div>
      </div>
    )
  }
)

ContextField.displayName = "ContextField"
