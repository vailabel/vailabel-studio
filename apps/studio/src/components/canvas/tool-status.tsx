import { memo } from "react"

interface ToolStatusProps {
  tool: string
  isVisible: boolean
  pointCount?: number
  isDragging?: boolean
  isDrawing?: boolean
  isMoving?: boolean
  isResizing?: boolean
}

export const ToolStatus = memo(({ 
  tool, 
  isVisible, 
  pointCount = 0,
  isDragging = false,
  isDrawing = false,
  isMoving = false,
  isResizing = false
}: ToolStatusProps) => {
  if (!isVisible) return null

  const getStatusMessage = () => {
    switch (tool) {
      case "move":
        if (isMoving) return "Moving annotation..."
        if (isResizing) return "Resizing annotation..."
        return "Click and drag to move annotations, drag handles to resize"
      
      case "box":
        if (isDragging) return "Drawing box..."
        return "Click and drag to draw a rectangle"
      
      case "polygon":
        if (pointCount === 0) return "Click to start drawing polygon"
        if (pointCount < 3) return `Add ${3 - pointCount} more point${3 - pointCount > 1 ? 's' : ''} to close polygon`
        return "Click first point to close, or press Enter/Double-click to finish"
      
      case "freeDraw":
        if (isDrawing) return "Drawing freeform shape..."
        return "Click and drag to draw freeform shapes"
      
      case "delete":
        return "Click on any annotation to delete it"
      
      default:
        return ""
    }
  }

  const getInstructions = () => {
    const instructions = []
    
    switch (tool) {
      case "move":
        instructions.push("Drag: Move annotation")
        instructions.push("Drag handles: Resize annotation")
        break
      
      case "box":
        instructions.push("Click & drag: Draw rectangle")
        instructions.push("Escape: Cancel drawing")
        break
      
      case "polygon":
        if (pointCount > 0) {
          instructions.push("Right-click or Backspace: Undo last point")
        }
        instructions.push("Escape: Cancel polygon")
        if (pointCount >= 3) {
          instructions.push("Enter: Finish polygon")
        }
        break
      
      case "freeDraw":
        instructions.push("Click & drag: Draw shape")
        instructions.push("Escape: Cancel drawing")
        break
      
      case "delete":
        instructions.push("Click: Delete annotation")
        instructions.push("Escape: Cancel deletion")
        break
    }
    
    return instructions
  }

  const getToolIcon = () => {
    switch (tool) {
      case "move": return "↔️"
      case "box": return "⬜"
      case "polygon": return "🔺"
      case "freeDraw": return "✏️"
      case "delete": return "🗑️"
      default: return "🛠️"
    }
  }

  const getStatusColor = () => {
    if (isDragging || isDrawing || isMoving || isResizing) {
      return "bg-blue-600 border-blue-500"
    }
    return "bg-gray-900 border-gray-700"
  }

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className={`${getStatusColor()} text-white px-4 py-2 rounded-lg shadow-lg border`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{getToolIcon()}</span>
          <div className="text-sm font-medium">
            {getStatusMessage()}
          </div>
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          {getInstructions().map((instruction, index) => (
            <div key={index}>{instruction}</div>
          ))}
        </div>
      </div>
    </div>
  )
})

ToolStatus.displayName = "ToolStatus"
