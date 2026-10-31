import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react"
import { Check, Trash2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { ControlTag } from "@/shared/lib/label-config/types"
import type { StoredResult } from "@/shared/lib/label-config/result"
import { Button } from "@/shared/ui/button"
import { FloatingLabelMenu } from "../text/floating-label-menu"
import { RegionOverlay } from "./region-overlay"
import { regionsFromResults } from "./regions-from-results"
import { useImageRegionDraw } from "./use-image-region-draw"
import { useBrushDraw, type RasterSize } from "./use-brush-draw"
import type { RegionTools } from "./region-tools"

interface RegionSurfaceProps {
  tools: RegionTools
  /** Results to draw, keyed by control name (already scoped to this surface). */
  resultsByControl: Record<string, StoredResult[]>
  /** Natural size of the media underneath — the brush paints at this size. */
  size: RasterSize | null
  /** Merged into every region created here (e.g. `{page}` or `{slice}`). */
  extra?: Record<string, unknown>
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
  /** The media itself (an <img> or <canvas> filling the surface width). */
  children: ReactNode
  className?: string
}

/**
 * A drawable region layer over any raster media (image, PDF page, DICOM slice):
 * box / ellipse / polygon / keypoint / brush tools from `tools`, stored regions
 * from `resultsByControl`, and the floating label menu for labeled controls.
 */
export const RegionSurface = memo(
  ({
    tools,
    resultsByControl,
    size,
    extra,
    onCreateRegion,
    onDeleteRegion,
    children,
    className,
  }: RegionSurfaceProps) => {
    const regions = useMemo(
      () => regionsFromResults(tools.controls, resultsByControl),
      [tools.controls, resultsByControl]
    )

    // Creating a region from the brush draft also clears the draft.
    const clearDraft = useRef(() => {})
    const create = useCallback(
      (control: ControlTag, value: Record<string, unknown>, color: string) => {
        onCreateRegion(control, value, color)
        if (value.format === "rle") clearDraft.current()
      },
      [onCreateRegion]
    )
    const draw = useImageRegionDraw(tools, create, extra)
    const brush = useBrushDraw(tools, size, draw.fracOf, draw.propose)
    useEffect(() => {
      clearDraft.current = brush.clear
    }, [brush.clear])

    return (
      <div className={cn("relative", className)}>
        <div
          ref={draw.containerRef}
          onPointerDown={(event) => {
            draw.onPointerDown(event)
            brush.onPointerDown(event)
          }}
          onClick={draw.onClick}
          onMouseMove={draw.onMouseMove}
          className={cn("relative select-none", tools.active && "cursor-crosshair")}
        >
          {children}
          <RegionOverlay
            regions={regions}
            poly={draw.poly}
            cursor={draw.cursor}
            boxPreview={draw.boxPreview}
            onDeleteRegion={onDeleteRegion}
          />
          {size && (
            <canvas
              ref={brush.canvasRef}
              width={size.width}
              height={size.height}
              className={cn(
                "pointer-events-none absolute inset-0 h-full w-full",
                !brush.enabled && "hidden"
              )}
            />
          )}
        </div>

        {brush.enabled && brush.hasDraft && (
          <div className="absolute right-2 top-2 flex gap-1">
            <Button
              size="sm"
              onClick={(event) => brush.save(event.clientX, event.clientY)}
            >
              <Check className="size-3.5" />
              Save mask
            </Button>
            <Button size="sm" variant="outline" onClick={brush.clear}>
              <Trash2 className="size-3.5" />
              Discard
            </Button>
          </div>
        )}

        {tools.shape === "polygonlabels" && draw.poly.length > 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Click the first point to close the polygon ({draw.poly.length} point
            {draw.poly.length === 1 ? "" : "s"}).
          </p>
        )}

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

RegionSurface.displayName = "RegionSurface"
