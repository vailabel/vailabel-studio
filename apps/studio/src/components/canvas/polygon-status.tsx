import { memo } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PolygonStatusProps {
  pointCount: number
  isVisible: boolean
}

export const PolygonStatus = memo(({ pointCount, isVisible }: PolygonStatusProps) => {
  if (!isVisible) return null

  const getStatusMessage = () => {
    if (pointCount === 0) {
      return "Click to start drawing polygon"
    } else if (pointCount < 3) {
      return `Add ${3 - pointCount} more point${3 - pointCount > 1 ? 's' : ''} to close polygon`
    } else {
      return "Click first point to close, or press Enter/Double-click to finish"
    }
  }

  const getInstructions = () => {
    const instructions = []
    if (pointCount > 0) {
      instructions.push("Right-click or Backspace: Undo last point")
    }
    instructions.push("Escape: Cancel polygon")
    if (pointCount >= 3) {
      instructions.push("Enter: Finish polygon")
    }
    return instructions
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700">
            <div className="text-sm font-medium mb-1">
              {getStatusMessage()}
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              {getInstructions().map((instruction, index) => (
                <div key={index}>{instruction}</div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

PolygonStatus.displayName = "PolygonStatus"
