import { motion } from "framer-motion"
import { rgbToRgba } from "@/lib/utils"
import type { Annotation } from "@/lib/types"

interface PolygonAnnotationProps {
  annotation: Annotation
  selectedLabelId: string | null
  selectedTool: string
  uiZoom: number
}

export function PolygonAnnotation({
  annotation,
  selectedLabelId,
  selectedTool,
  uiZoom,
}: PolygonAnnotationProps) {
  return (
    <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        points={annotation.coordinates.map((p) => `${p.x},${p.y}`).join(" ")}
        style={{
          fill:
            selectedLabelId === annotation.id
              ? rgbToRgba(annotation.color || "yellow", 0.5)
              : annotation.isAIGenerated
                ? rgbToRgba(annotation.color || "green", 0.5)
                : rgbToRgba(annotation.color || "blue", 0.2),
          stroke:
            selectedLabelId === annotation.id
              ? annotation.color || "yellow"
              : annotation.isAIGenerated
                ? annotation.color || "green"
                : annotation.color || "blue",
          strokeWidth: 2,
        }}
      />
      <text
        x={annotation.coordinates[0].x}
        y={annotation.coordinates[0].y - 10}
        style={{
          fill:
            selectedLabelId === annotation.id
              ? annotation.color || "yellow"
              : annotation.isAIGenerated
                ? annotation.color || "green"
                : "black",
        }}
        className="text-xs"
      >
        {annotation.name}
      </text>

      {selectedLabelId === annotation.id && selectedTool === "move" && (
        <>
          {annotation.coordinates.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4 / uiZoom}
              className="fill-white stroke-gray-400 stroke-1 cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation()
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const rect = (
                    e.target as SVGCircleElement
                  ).ownerSVGElement?.getBoundingClientRect()
                  if (rect) {
                    const newX = (moveEvent.clientX - rect.left) / uiZoom
                    const newY = (moveEvent.clientY - rect.top) / uiZoom
                    annotation.coordinates[index] = { x: newX, y: newY }
                  }
                }
                const onMouseUp = () => {
                  window.removeEventListener("mousemove", onMouseMove)
                  window.removeEventListener("mouseup", onMouseUp)
                }
                window.addEventListener("mousemove", onMouseMove)
                window.addEventListener("mouseup", onMouseUp)
              }}
            />
          ))}
        </>
      )}
    </svg>
  )
}
