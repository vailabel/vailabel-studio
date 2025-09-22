import { memo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SketchPicker } from "react-color"
import { cn } from "@/lib/utils"

interface Label {
  name: string
  color: string
}

interface LabelManagerProps {
  labels: Label[]
  onAddLabel: (label: Label) => void
  onRemoveLabel: (index: number) => void
  className?: string
}

const colorPalette = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e42", // orange
  "#a855f7", // purple
  "#fbbf24", // yellow
  "#6366f1", // indigo
  "#6b7280", // gray
  "#ec4899", // pink
  "#14b8a6", // teal
]

export const LabelManager = memo(({ labels, onAddLabel, onRemoveLabel, className }: LabelManagerProps) => {
  const [labelInput, setLabelInput] = useState("")
  const [labelColor, setLabelColor] = useState("#3b82f6")
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleAddLabel = () => {
    if (!labelInput.trim()) return
    
    onAddLabel({
      name: labelInput.trim(),
      color: labelColor,
    })
    
    setLabelInput("")
    setLabelColor("#3b82f6")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddLabel()
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-base font-semibold">Labels</Label>
      
      {/* Add Label Form */}
      <div className="flex gap-2 items-center">
        <Input
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          placeholder="Enter label name"
          className="flex-1"
          onKeyPress={handleKeyPress}
          maxLength={50}
        />
        
        {/* Color Palette */}
        <div className="flex gap-1 items-center">
          {colorPalette.map((color) => (
            <motion.button
              key={color}
              type="button"
              className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                labelColor === color
                  ? "border-black dark:border-white scale-110 shadow-md"
                  : "border-gray-300 hover:scale-105"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                setLabelColor(color)
                setShowColorPicker(false)
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {labelColor === color && (
                <span className="block w-3 h-3 rounded-full border-2 border-white bg-white/30" />
              )}
            </motion.button>
          ))}
          
          {/* Custom Color Picker */}
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <motion.button
                type="button"
                className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                  !colorPalette.includes(labelColor) || showColorPicker
                    ? "border-black dark:border-white scale-110 shadow-md"
                    : "border-gray-300 hover:scale-105"
                )}
                style={{ background: labelColor }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Palette className="w-3 h-3 text-white" />
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="p-2 w-auto" align="start">
              <SketchPicker
                color={labelColor}
                onChangeComplete={(color) => {
                  setLabelColor(color.hex)
                  setShowColorPicker(false)
                }}
                disableAlpha
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button
          type="button"
          onClick={handleAddLabel}
          disabled={!labelInput.trim()}
          className="ml-2"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
      
      {/* Labels List */}
      <AnimatePresence>
        {labels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 mt-2"
          >
            {labels.map((label, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border shadow-sm"
                style={{
                  backgroundColor: label.color,
                  color: "#fff",
                  borderColor: label.color,
                }}
              >
                {label.name}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="ml-1 p-0 h-4 w-4 text-white hover:bg-white/20"
                  onClick={() => onRemoveLabel(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Add at least one label to categorize your annotations. You can add up to 20 labels.
      </p>
    </div>
  )
})

LabelManager.displayName = "LabelManager"
