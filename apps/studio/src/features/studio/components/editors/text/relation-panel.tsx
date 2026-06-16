import { memo, useMemo } from "react"
import { ArrowRight, Spline, X } from "lucide-react"
import type { EntitySpan, RelationLink } from "@/features/studio/model/lib/text-spans"

interface RelationPanelProps {
  relations: RelationLink[]
  spans: EntitySpan[]
  linkingId: string | null
  onDelete: (annotationId: string) => void
}

// Lists the directed relations between entities. Creation happens by clicking
// two entities in the document (or via the entity list's link button).
export const RelationPanel = memo(
  ({ relations, spans, linkingId, onDelete }: RelationPanelProps) => {
    const byId = useMemo(() => {
      const map = new Map<string, EntitySpan>()
      for (const span of spans) map.set(span.id, span)
      return map
    }, [spans])

    const labelFor = (id: string) => {
      const span = byId.get(id)
      if (!span) return "—"
      return span.quote ? `${span.label}: ${span.quote}` : span.label
    }

    return (
      <div className="flex max-h-40 shrink-0 flex-col border-t border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Spline className="size-3.5" />
          Relations ({relations.length})
          {linkingId && (
            <span className="font-normal text-primary">
              · pick a target entity
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
          {relations.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Click an entity, then another, to link them.
            </p>
          ) : (
            <ul className="flex flex-col">
              {relations.map((relation) => (
                <li
                  key={relation.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    <span className="truncate">{labelFor(relation.fromId)}</span>
                    <ArrowRight className="mx-1 inline size-3" />
                    <span className="truncate">{labelFor(relation.toId)}</span>
                  </span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
                    {relation.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(relation.id)}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                    aria-label="Remove relation"
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
  }
)

RelationPanel.displayName = "RelationPanel"
