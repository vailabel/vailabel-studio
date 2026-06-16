import { memo, useState } from "react"
import { ArrowRight, Link2, Spline, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export interface RegionInfo {
  id: string
  label: string
  color: string
  control: string
}

export interface RelationInfo {
  id: string
  fromId: string
  toId: string
}

interface RelationsPanelProps {
  regions: RegionInfo[]
  relations: RelationInfo[]
  onLink: (fromId: string, toId: string) => void
  onDelete: (annotationId: string) => void
}

// Links any two existing regions (boxes / polygons / keypoints / spans) into a
// directed relation. Click "link" on a source region, then on a target.
export const RelationsPanel = memo(
  ({ regions, relations, onLink, onDelete }: RelationsPanelProps) => {
    const [linkingId, setLinkingId] = useState<string | null>(null)
    const labelFor = (id: string) => {
      const region = regions.find((r) => r.id === id)
      return region ? `${region.control}: ${region.label}` : "—"
    }

    const handleLink = (id: string) => {
      if (!linkingId) {
        setLinkingId(id)
      } else if (linkingId === id) {
        setLinkingId(null)
      } else {
        onLink(linkingId, id)
        setLinkingId(null)
      }
    }

    return (
      <div className="flex max-h-56 shrink-0 flex-col border-t border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Spline className="size-3.5" />
          Relations ({relations.length})
          {linkingId && (
            <span className="font-normal text-primary">· pick a target region</span>
          )}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-auto p-2">
          {/* Regions to link */}
          <div className="flex flex-col">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Regions
            </p>
            {regions.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">No regions yet.</p>
            ) : (
              <ul className="flex flex-col">
                {regions.map((region) => (
                  <li
                    key={region.id}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted",
                      linkingId === region.id && "ring-1 ring-primary"
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: region.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {region.control}: {region.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLink(region.id)}
                      className={cn(
                        "rounded p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground",
                        linkingId === region.id && "text-primary"
                      )}
                      aria-label="Link region"
                    >
                      <Link2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Existing relations */}
          <div className="flex flex-col border-l border-border pl-2">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Links
            </p>
            {relations.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                Click two regions to link them.
              </p>
            ) : (
              <ul className="flex flex-col">
                {relations.map((relation) => (
                  <li
                    key={relation.id}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {labelFor(relation.fromId)}
                      <ArrowRight className="mx-1 inline size-3" />
                      {labelFor(relation.toId)}
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
      </div>
    )
  }
)

RelationsPanel.displayName = "RelationsPanel"
