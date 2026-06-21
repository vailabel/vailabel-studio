import type { Annotation } from "@/shared/types/core"
import { getContentBoxColor } from "@/shared/lib/utils"
import { memo } from "react"
import { useCanvasZoom } from "@/features/studio/canvas-state/canvas-context"
import { DimensionBadge } from "../annotation-styles"

interface TempBoxAnnotationProps {
  annotation: Partial<Annotation>
}

export const TempBoxAnnotation = memo(
  ({ annotation }: TempBoxAnnotationProps) => {
    const { zoom } = useCanvasZoom()

    if (
      annotation.type !== "box" ||
      !annotation.coordinates ||
      annotation.coordinates.length !== 2
    ) {
      return null
    }

    const [topLeft, bottomRight] = annotation.coordinates
    const x = Math.min(topLeft.x, bottomRight.x)
    const y = Math.min(topLeft.y, bottomRight.y)
    const width = Math.abs(bottomRight.x - topLeft.x)
    const height = Math.abs(bottomRight.y - topLeft.y)
    const color = annotation.color ?? "#3b82f6"

    return (
      <svg
        className="absolute left-0 top-0 h-full w-full pointer-events-none"
        style={{ overflow: "visible" }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          vectorEffect="non-scaling-stroke"
          style={{
            fill: getContentBoxColor(color, 0.5),
            stroke: color,
            strokeWidth: 2,
            strokeDasharray: "4 2", // Dotted line
          }}
        />
        {/* Live size readout while dragging — like every pro annotation/design tool. */}
        {width > 0 && height > 0 ? (
          <DimensionBadge
            x={x}
            y={y}
            width={width}
            height={height}
            zoom={zoom}
          />
        ) : null}
      </svg>
    )
  }
)

TempBoxAnnotation.displayName = "TempBoxAnnotation"

