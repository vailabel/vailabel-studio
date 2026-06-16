import { X } from "lucide-react"
import { rgbToRgba } from "@/shared/lib/utils"
import type { BoxPreview } from "./use-image-region-draw"
import type { Pt, Region } from "./region-types"

interface RegionOverlayProps {
  regions: Region[]
  /** In-progress polygon points (committed vertices). */
  poly: Pt[]
  /** Live cursor position for the polygon rubber-band segment. */
  cursor: Pt | null
  /** Live box-drag preview, or null when not dragging. */
  boxPreview: BoxPreview | null
  onDeleteRegion: (annotationId: string) => void
}

/**
 * Presentational layer drawn over the image: an SVG plane for shape geometry
 * (rectangles, polygons, the box-drag preview, and the in-progress polyline)
 * plus an HTML plane for keypoints, label chips, delete buttons, and the
 * in-progress polygon vertices. Stateless — all interaction lives in the host.
 */
export const RegionOverlay = ({
  regions,
  poly,
  cursor,
  boxPreview,
  onDeleteRegion,
}: RegionOverlayProps) => (
  <>
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {regions.map((region) =>
        region.tag === "rectanglelabels" ? (
          <rect
            key={region.id}
            x={region.x}
            y={region.y}
            width={region.width}
            height={region.height}
            fill={rgbToRgba(region.color, 0.12)}
            stroke={region.color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ) : region.tag === "polygonlabels" ? (
          <polygon
            key={region.id}
            points={region.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill={rgbToRgba(region.color, 0.12)}
            stroke={region.color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ) : null
      )}

      {boxPreview && boxPreview.width > 0 && (
        <rect
          x={boxPreview.x}
          y={boxPreview.y}
          width={boxPreview.width}
          height={boxPreview.height}
          fill="rgba(59,130,246,0.15)"
          stroke="#3b82f6"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {poly.length > 0 && (
        <polyline
          points={[...poly, cursor ?? poly[poly.length - 1]]
            .map((p) => `${p[0]},${p[1]}`)
            .join(" ")}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>

    {/* HTML overlay: keypoints, labels, vertices, delete buttons */}
    <div className="pointer-events-none absolute inset-0">
      {regions.map((region) => {
        const anchor =
          region.tag === "polygonlabels"
            ? region.points[0] ?? [0, 0]
            : [region.x, region.y]
        return (
          <div key={region.id}>
            {region.tag === "keypointlabels" && (
              <span
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  backgroundColor: region.color,
                }}
              />
            )}
            <span
              className="pointer-events-auto absolute inline-flex -translate-y-full items-center gap-0.5 rounded-t px-1 text-[10px] font-semibold uppercase leading-tight text-white"
              style={{
                left: `${anchor[0]}%`,
                top: `${anchor[1]}%`,
                backgroundColor: region.color,
              }}
            >
              {region.label}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteRegion(region.id)
                }}
                className="rounded-full hover:bg-black/20"
                aria-label={`Remove ${region.label}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          </div>
        )
      })}

      {/* In-progress polygon vertices */}
      {poly.map((point, index) => (
        <span
          key={index}
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
          style={{ left: `${point[0]}%`, top: `${point[1]}%` }}
        />
      ))}
    </div>
  </>
)
