import { memo, useState } from "react"
import { Plus, Loader2, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SketchPicker } from "react-color"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { LabelCreateForm } from "@/viewmodels/project-detail-viewmodel"
import { LabelCreateSchema } from "@/viewmodels/project-detail-viewmodel"
import { randomLabelColor } from "@/components/labels/label-colors"

interface AddLabelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (formData: LabelCreateForm) => Promise<void>
  isLoading: boolean
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

export const AddLabelModal = memo(({
  isOpen,
  onClose,
  onCreate,
  isLoading,
}: AddLabelModalProps) => {
  const [labelColor, setLabelColor] = useState(randomLabelColor)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LabelCreateForm>({
    resolver: zodResolver(LabelCreateSchema),
    defaultValues: {
      name: "",
      color: randomLabelColor(),
    },
  })

  const handleClose = () => {
    const nextColor = randomLabelColor()
    reset({ name: "", color: nextColor })
    setLabelColor(nextColor)
    setShowColorPicker(false)
    onClose()
  }

  const onSubmit = async (formData: LabelCreateForm) => {
    await onCreate({ ...formData, color: labelColor })
  }

  const handleColorChange = (color: string) => {
    setLabelColor(color)
    setValue("color", color)
    setShowColorPicker(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Label
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label-name" className="text-sm font-medium">
              Label Name *
            </Label>
            <Input
              id="label-name"
              {...register("name")}
              placeholder="Enter label name"
              className="h-10"
              maxLength={50}
            />
            {errors.name && (
              <p className="text-red-500 text-xs flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <span>⚠</span>
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Color *</Label>
            <div className="flex gap-2 items-center">
              {/* Color Palette */}
              <div className="flex gap-1 items-center">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform duration-150 ease-out hover:scale-110 active:scale-95 ${
                      labelColor === color
                        ? "border-black dark:border-white scale-110 shadow-md"
                        : "border-input"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  >
                    {labelColor === color && (
                      <span className="block w-3 h-3 rounded-full border-2 border-white bg-card/30" />
                    )}
                  </button>
                ))}
                
                {/* Custom Color Picker */}
                <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform duration-150 ease-out hover:scale-110 active:scale-95 ${
                          !colorPalette.includes(labelColor) || showColorPicker
                            ? "border-black dark:border-white scale-110 shadow-md"
                            : "border-input"
                        }`}
                        style={{ background: labelColor }}
                      />
                    }
                  >
                    <Palette className="w-3 h-3 text-white" />
                  </PopoverTrigger>
                  <PopoverContent className="p-2 w-auto" align="start">
                    <SketchPicker
                      color={labelColor}
                      onChangeComplete={(color) => handleColorChange(color.hex)}
                      disableAlpha
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {errors.color && (
              <p className="text-red-500 text-xs flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <span>⚠</span>
                {errors.color.message}
              </p>
            )}
          </div>

          {/* Color Preview */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: labelColor }}
            />
            <span className="text-sm text-muted-foreground">
              Preview: {labelColor}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Label
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})

AddLabelModal.displayName = "AddLabelModal"
