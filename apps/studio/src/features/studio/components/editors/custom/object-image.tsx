import { memo, useMemo } from "react"
import { toAssetUrl } from "@/shared/lib/desktop"
import { cn } from "@/shared/lib/utils"
import type { Item } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import type { StoredResult } from "@/shared/lib/label-config/result"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { RegionOverlay } from "./region-overlay"
import { RegionToolbar } from "./region-toolbar"
import { regionsFromResults } from "./regions-from-results"
import { useImageRegionDraw } from "./use-image-region-draw"

interface ObjectImageProps {
  doc: Item
  /** Spatial controls bound to this image (rectangle/polygon/keypoint). */
  controls: ControlTag[]
  resultsByControl: Record<string, StoredResult[]>
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

export const ObjectImage = memo(
  ({ doc, controls, resultsByControl, onCreateRegion, onDeleteRegion }: ObjectImageProps) => {
    const draw = useImageRegionDraw(controls, onCreateRegion)
    const regions = useMemo(
      () => regionsFromResults(controls, resultsByControl),
      [controls, resultsByControl]
    )

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {controls.length > 1 && (
          <RegionToolbar
            controls={controls}
            activeIndex={draw.activeIndex}
            onSelect={draw.selectTool}
          />
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div
            ref={draw.containerRef}
            onPointerDown={draw.onPointerDown}
            onClick={draw.onClick}
            onMouseMove={draw.onMouseMove}
            className={cn(
              "relative mx-auto w-full max-w-4xl select-none",
              draw.active && "cursor-crosshair"
            )}
          >
            <img
              src={toAssetUrl(doc.path)}
              alt={doc.name}
              draggable={false}
              className="block w-full rounded"
            />

            <RegionOverlay
              regions={regions}
              poly={draw.poly}
              cursor={draw.cursor}
              boxPreview={draw.boxPreview}
              onDeleteRegion={onDeleteRegion}
            />
          </div>

          {draw.active?.tag === "polygonlabels" && draw.poly.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Click the first point to close the polygon ({draw.poly.length} point
              {draw.poly.length === 1 ? "" : "s"}).
            </p>
          )}
        </div>

        {draw.pending && (
          <FloatingLabelMenu
            x={draw.pending.clientX}
            y={draw.pending.clientY}
            labels={draw.labels}
            emptyHint="Add a label to this control."
            onPick={draw.pickLabel}
            onDismiss={draw.dismissPending}
          />
        )}
      </div>
    )
  }
)

ObjectImage.displayName = "ObjectImage"
