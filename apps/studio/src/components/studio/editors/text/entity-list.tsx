import { memo } from "react"
import { Link2, Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EntitySpan } from "@/lib/text-spans"

interface EntityListProps {
  spans: EntitySpan[]
  onDelete: (annotationId: string) => void
  /** Relation mode: start/continue a link from an entity. */
  onLink?: (annotationId: string) => void
  linkingId?: string | null
}

// Manageable list of every labeled entity (works even when overlaps hide a tag
// in the text). In relation mode each row gets a link affordance.
export const EntityList = memo(
  ({ spans, onDelete, onLink, linkingId }: EntityListProps) => (
    <div className="flex max-h-40 shrink-0 flex-col border-t border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground">
        <Tag className="size-3.5" />
        Entities ({spans.length})
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
        {spans.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No entities yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {[...spans]
              .sort((a, b) => a.start - b.start)
              .map((span) => (
                <li
                  key={span.id}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted",
                    linkingId === span.id && "ring-1 ring-primary"
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: span.color }}
                  />
                  <span className="shrink-0 text-xs font-semibold uppercase text-muted-foreground">
                    {span.label}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-muted-foreground"
                    title={span.quote}
                  >
                    {span.quote ?? "—"}
                  </span>
                  {onLink && (
                    <button
                      type="button"
                      onClick={() => onLink(span.id)}
                      className={cn(
                        "rounded p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground",
                        linkingId === span.id && "text-primary"
                      )}
                      aria-label={`Link from ${span.label}`}
                      title={
                        linkingId === span.id
                          ? "Pick a target entity"
                          : "Start a relation from here"
                      }
                    >
                      <Link2 className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(span.id)}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                    aria-label={`Remove ${span.label}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
)

EntityList.displayName = "EntityList"
