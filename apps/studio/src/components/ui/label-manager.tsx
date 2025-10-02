import { memo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Palette, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Add Label Form */}
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Label Name</Label>
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Enter label name (e.g., 'Person', 'Car', 'Building')"
                className="h-11 border-2 focus:border-primary/50 transition-all duration-200"
                onKeyPress={handleKeyPress}
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Color</Label>
              <div className="flex gap-2 items-center">
                {/* Color Palette */}
                <div className="flex gap-1 items-center bg-muted/30 p-2 rounded-lg">
                  {colorPalette.map((color) => (
                    <Tooltip key={color}>
                      <TooltipTrigger asChild>
                        <motion.button
                          type="button"
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            labelColor === color
                              ? "border-foreground scale-110 shadow-md"
                              : "border-muted-foreground/30 hover:scale-105 hover:border-muted-foreground/50"
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
                            <span className="block w-2 h-2 rounded-full border border-white bg-white/50" />
                          )}
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Use {color}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  
                  {/* Custom Color Picker */}
                  <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                    <PopoverTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                            type="button"
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              !colorPalette.includes(labelColor) || showColorPicker
                                ? "border-foreground scale-110 shadow-md"
                                : "border-muted-foreground/30 hover:scale-105 hover:border-muted-foreground/50"
                            )}
                            style={{ background: labelColor }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Palette className="w-3 h-3 text-white" />
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Custom color</p>
                        </TooltipContent>
                      </Tooltip>
                    </PopoverTrigger>
                    <PopoverContent className="p-3 w-auto" align="start">
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
              </div>
            </div>
            
            <Button
              type="button"
              onClick={handleAddLabel}
              disabled={!labelInput.trim()}
              className="h-11 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Label
            </Button>
          </div>
        </div>
      
        {/* Labels List */}
        <AnimatePresence>
          {labels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Labels ({labels.length})
                </span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {labels.map((label, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="group relative"
                  >
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-2 shadow-sm hover:shadow-md transition-all duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: label.color,
                        color: "#fff",
                        borderColor: label.color,
                      }}
                    >
                      <span>{label.name}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0 text-white hover:bg-white/20 rounded-full"
                            onClick={() => onRemoveLabel(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove label</p>
                        </TooltipContent>
                      </Tooltip>
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Helper Text */}
        <div className="bg-muted/30 p-4 rounded-lg border border-muted/50">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Tag className="w-3 h-3 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Label Requirements
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add at least one label to categorize your annotations. You can add up to 20 labels. 
                Each label will be available when annotating your images.
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
})

LabelManager.displayName = "LabelManager"
