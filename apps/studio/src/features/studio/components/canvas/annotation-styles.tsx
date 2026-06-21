import { memo } from "react"
import { getContentBoxColor } from "@/shared/lib/utils"

// Single source of truth for how committed annotations look, so every tool's
// shape renders consistently: same stroke weight, same translucent fill, same
// selected treatment (the class color stays — selection only thickens the
// stroke and deepens the fill; shapes never flip to a different color), and the
// same class-name badge.

export const STROKE_WIDTH = 2
export const SELECTED_STROKE_WIDTH = 3
/** Content fill is the label color at 50% (deepened slightly when selected). */
export const FILL_OPACITY = 0.5
export const SELECTED_FILL_OPACITY = 0.6
export const READONLY_DASH = "6 4"
/** Vertex / resize handle radius in screen px (callers divide by zoom). */
export const HANDLE_RADIUS = 5

export function strokeWidthFor(isSelected: boolean): number {
  return isSelected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH
}

// getContentBoxColor handles BOTH hex ("#3b82f6") and "rgb(...)" inputs; the
// older rgbToRgba mis-parsed hex (it pulled the digits out of "#3b82f6" and
// produced rgba(3,82,6,…)), so palette-created labels rendered the wrong fill.
export function fillFor(color: string | undefined, isSelected: boolean): string {
  return getContentBoxColor(
    color || "#3b82f6",
    isSelected ? SELECTED_FILL_OPACITY : FILL_OPACITY
  )
}

export function dashFor(readOnly: boolean): string {
  return readOnly ? READONLY_DASH : "none"
}

interface AnnotationLabelProps {
  /** Anchor (image-space). The badge sits just above this point. */
  x: number
  y: number
  color: string
  name?: string
  zoom: number
}

/**
 * Shared class-name badge: a colored pill with white text. Sized by 1/zoom so it
 * stays a constant on-screen size at any zoom (plain SVG <text> would balloon
 * when zoomed in). Every SVG shape renderer uses this so labels look identical.
 */
export const AnnotationLabel = memo(
  ({ x, y, color, name, zoom }: AnnotationLabelProps) => {
    if (!name) return null
    const z = zoom || 1
    const fontSize = 12 / z
    const padX = 5 / z
    const padY = 3 / z
    const gap = 6 / z
    const height = fontSize + padY * 2
    const width = name.length * fontSize * 0.6 + padX * 2
    const radius = 3 / z
    // Sit just above the anchor; if that would clip off the top edge (shape is at
    // the very top of the image), drop the badge just inside the shape instead so
    // it stays fully visible — standard labeling-tool behavior.
    const above = y - gap - height
    const top = above < 0 ? y + gap : above
    return (
      <g pointerEvents="none">
        <rect
          x={x}
          y={top}
          width={width}
          height={height}
          rx={radius}
          ry={radius}
          fill={color || "#3b82f6"}
        />
        <text
          x={x + padX}
          y={top + padY + fontSize * 0.82}
          fontSize={fontSize}
          fill="#ffffff"
          style={{ fontWeight: 600 }}
        >
          {name}
        </text>
      </g>
    )
  }
)

AnnotationLabel.displayName = "AnnotationLabel"

interface DimensionBadgeProps {
  /** Box origin + size in image space. */
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

/**
 * A live "W × H" size pill, the way Figma / Photoshop / CVAT show a box's
 * dimensions while you draw or resize it. Dark neutral pill (it sits over the
 * image, so a literal color is intentional) centered just below the box, and
 * counter-scaled by 1/zoom so it stays a constant on-screen size.
 */
export const DimensionBadge = memo(
  ({ x, y, width, height, zoom }: DimensionBadgeProps) => {
    const z = zoom || 1
    const fontSize = 11 / z
    const padX = 5 / z
    const padY = 3 / z
    const gap = 6 / z
    const radius = 3 / z
    const label = `${Math.round(width)} × ${Math.round(height)}`
    const badgeH = fontSize + padY * 2
    const badgeW = label.length * fontSize * 0.6 + padX * 2
    // Centered just below the box (where Figma/Photoshop put it).
    const left = x + width / 2 - badgeW / 2
    const top = y + height + gap
    return (
      <g pointerEvents="none">
        <rect
          x={left}
          y={top}
          width={badgeW}
          height={badgeH}
          rx={radius}
          ry={radius}
          fill="rgba(17,24,39,0.9)"
        />
        <text
          x={left + padX}
          y={top + padY + fontSize * 0.82}
          fontSize={fontSize}
          fill="#ffffff"
          style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
        >
          {label}
        </text>
      </g>
    )
  }
)

DimensionBadge.displayName = "DimensionBadge"
