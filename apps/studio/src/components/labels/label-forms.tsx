import React, { useState } from "react"
import { Plus, Palette, Edit, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SketchPicker } from "react-color"
import { useProjects } from "@/hooks/api/project-hooks"
import { Label as LabelType } from "@vailabel/core"

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

interface LabelCreateFormProps {
  onCreateLabel: (label: Omit<LabelType, "id">) => Promise<void>
}

export const LabelCreateForm: React.FC<LabelCreateFormProps> = ({
  onCreateLabel,
}) => {
  const { data: projects = [] } = useProjects()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    projectId: "",
    description: "",
  })
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Set default project when projects are loaded
  React.useEffect(() => {
    if (projects.length > 0 && !formData.projectId) {
      setFormData((prev) => ({ ...prev, projectId: projects[0].id }))
    }
  }, [projects, formData.projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.projectId) return

    setIsLoading(true)
    try {
      await onCreateLabel({
        name: formData.name.trim(),
        color: formData.color,
        projectId: formData.projectId,
        category: formData.description.trim(),
      })

      setFormData({
        name: "",
        color: "#3b82f6",
        projectId: "",
        description: "",
      })
      setOpen(false)
    } catch (error) {
      console.error("Failed to create label:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Label
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Create New Label
          </DialogTitle>
          <DialogDescription>
            Create a new label for your annotation projects. Labels help
            categorize and organize your annotations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Label Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter label name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, projectId: value }))
              }
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color *</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color
                          ? "border-foreground scale-110 shadow-md"
                          : "border-border hover:scale-105 hover:shadow-sm"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                      title={color}
                    />
                  ))}
                </div>
                <Popover
                  open={showColorPicker}
                  onOpenChange={setShowColorPicker}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 border-2"
                      style={{
                        backgroundColor: formData.color,
                        borderColor:
                          formData.color === "#ffffff"
                            ? "#e5e7eb"
                            : formData.color,
                      }}
                    >
                      <Palette className="h-4 w-4 text-white drop-shadow-sm" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2 w-auto" align="start">
                    <SketchPicker
                      color={formData.color}
                      onChangeComplete={(color) => {
                        setFormData((prev) => ({ ...prev, color: color.hex }))
                        setShowColorPicker(false)
                      }}
                      disableAlpha
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: formData.color }}
                />
                <span>Selected: {formData.color}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Optional description for this label"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || !formData.name.trim() || !formData.projectId
              }
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Label
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface LabelEditFormProps {
  label: LabelType
  onUpdateLabel: (labelId: string, updates: Partial<LabelType>) => Promise<void>
  trigger?: React.ReactNode
}

export const LabelEditForm: React.FC<LabelEditFormProps> = ({
  label,
  onUpdateLabel,
  trigger,
}) => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: label.name,
    color: label.color,
    description: label.category || "",
  })
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsLoading(true)
    try {
      await onUpdateLabel(label.id, {
        name: formData.name.trim(),
        color: formData.color,
        category: formData.description.trim(),
      })
      setOpen(false)
    } catch (error) {
      console.error("Failed to update label:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Edit Label
          </DialogTitle>
          <DialogDescription>
            Update the label information. Changes will be reflected across all
            projects.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Label Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter label name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color *</Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color
                        ? "border-foreground scale-110"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-8 h-8"
                    style={{ backgroundColor: formData.color }}
                  >
                    <Palette className="h-4 w-4 text-white" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-2 w-auto" align="start">
                  <SketchPicker
                    color={formData.color}
                    onChangeComplete={(color) => {
                      setFormData((prev) => ({ ...prev, color: color.hex }))
                      setShowColorPicker(false)
                    }}
                    disableAlpha
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Optional description for this label"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Label
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
