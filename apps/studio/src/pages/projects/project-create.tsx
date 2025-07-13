import { useState, useRef } from "react"
import { X, Upload, Trash2, CheckCircle, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Project, ImageData } from "@vailabel/core"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { SketchPicker } from "react-color"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useProjectStore } from "@/stores/use-project-store"
import { useLabelStore } from "@/stores/use-label-store"
import { useImageDataStore } from "@/stores/use-image-data-store"

const ProjectDetailSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  labels: z
    .array(
      z.object({
        name: z.string().min(1, "Label name required"),
        color: z.string().min(1),
      })
    )
    .min(1, "At least one label required"),
})
type ProjectDetailForm = z.infer<typeof ProjectDetailSchema>

export function ProjectCreate() {
  const { toast } = useToast()
  const [images, setImages] = useState<ImageData[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [step, setStep] = useState<"details" | "dataset">("details")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createProject } = useProjectStore()
  const { createImage } = useImageDataStore()
  const { createLabel } = useLabelStore()
  const navigate = useNavigate()

  const {
    register: registerDetail,
    handleSubmit: handleSubmitDetail,
    setValue: setValueDetail,
    getValues: getValuesDetail,
    formState: { errors: errorsDetail },
    watch: watchDetail,
  } = useForm<ProjectDetailForm>({
    resolver: zodResolver(ProjectDetailSchema),
    defaultValues: { name: "", description: "", labels: [] },
  })

  const watchedLabels = watchDetail("labels")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (files: File[]) => {
    setIsUploading(true)

    try {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))

      if (imageFiles.length === 0) {
        toast({
          title: "No images found",
          description: "Please select image files (PNG, JPG, etc.)",
          variant: "destructive",
        })
        return
      }

      const newImages: ImageData[] = []

      for (const file of imageFiles) {
        const imageData = await readFileAsDataURL(file)
        const dimensions = await getImageDimensions(imageData)

        // Use a temporary value for projectId to satisfy the type, will be replaced on project creation
        newImages.push({
          id: crypto.randomUUID(),
          name: file.name,
          data: imageData,
          width: dimensions.width,
          height: dimensions.height,
          annotations: [],
        })
      }

      setImages([...images, ...newImages])

      toast({
        title: "Images added",
        description: `${newImages.length} images have been added to the project.`,
      })
    } catch (error) {
      console.error("Error processing files:", error)
      toast({
        title: "Error",
        description: "Failed to process image files",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getImageDimensions = (
    dataUrl: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        })
      }
      img.src = dataUrl
    })
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const [labelInput, setLabelInput] = useState("")
  const [labelColor, setLabelColor] = useState("#3b82f6")
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Predefined color palette
  const colorPalette = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e42", // orange
    "#a855f7", // purple
    "#fbbf24", // yellow
    "#6366f1", // indigo
    "#6b7280", // gray
  ]

  const addLabel = () => {
    if (!labelInput.trim()) return
    setValueDetail(
      "labels",
      [
        ...(getValuesDetail("labels") || []),
        { name: labelInput.trim(), color: labelColor },
      ],
      { shouldValidate: true }
    )
    setLabelInput("")
    setLabelColor("#3b82f6")
  }

  const removeLabel = (idx: number) => {
    setValueDetail(
      "labels",
      watchedLabels.filter((_, i) => i !== idx),
      { shouldValidate: true }
    )
  }

  const handleCreateProject = async () => {
    const details = getValuesDetail()
    if (!details.name.trim() || details.labels.length === 0) {
      toast({
        title: "Project details required",
        description: "Please fill in project name and at least one label",
        variant: "destructive",
      })
      return
    }
    if (images.length === 0) {
      toast({
        title: "No images",
        description: "Please add at least one image to your project",
        variant: "destructive",
      })
      return
    }
    try {
      const projectId = crypto.randomUUID()
      const newProject = {
        id: projectId,
        name: details.name.trim(),
        images: [],
      }
      await createProject(newProject as unknown as Project)

      // Save labels
      for (const label of details.labels) {
        // Add unique 'id' for each label before saving
        await createLabel({
          id: crypto.randomUUID(),
          ...label,
          projectId,
        })
      }

      // Save images
      for (const image of images) {
        await createImage({
          ...image,
          projectId,
        })
      }

      toast({
        title: "Project created",
        description:
          "Your project, labels, and images have been saved successfully.",
      })

      navigate("/projects")
    } catch {
      toast({
        title: "Error",
        description: "Failed to create project, labels, or images",
        variant: "destructive",
      })
    }
  }

  const steps = [{ label: "Project Details" }, { label: "Import Dataset" }]
  const stepIndex = step === "details" ? 0 : 1

  return (
    <Card className="w-full h-screen min-h-screen shadow-none border-none bg-white dark:bg-gray-900 p-0">
      {/* Removed Tab UI */}
      {/* Content */}
      <div className="w-full h-[calc(100vh-48px)] overflow-auto">
        <>
          {/* Stepper UI */}
          <div className="flex items-center justify-center gap-8 py-8">
            {steps.map((s, idx) => (
              <div key={s.label} className="flex items-center gap-2">
                <span
                  className={
                    "flex items-center justify-center rounded-full border-2 " +
                    (idx < stepIndex
                      ? "border-primary bg-primary text-white"
                      : idx === stepIndex
                        ? "border-primary text-primary bg-primary/10"
                        : "border-gray-300 text-gray-400 bg-gray-100 dark:bg-gray-800") +
                    " w-8 h-8 text-lg font-bold"
                  }
                >
                  {idx < stepIndex ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </span>
                <span
                  className={
                    "text-sm font-medium " +
                    (idx === stepIndex
                      ? "text-primary"
                      : "text-gray-500 dark:text-gray-400")
                  }
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <span className="w-8 h-0.5 bg-gray-300 dark:bg-gray-700 mx-2" />
                )}
              </div>
            ))}
          </div>
          {/* Step Content */}
          {step === "details" && (
            <Card className="shadow-none border-none bg-transparent">
              <CardContent className="p-8 space-y-8">
                <form
                  onSubmit={handleSubmitDetail(() => setStep("dataset"))}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <Label htmlFor="project-name" className="font-semibold">
                      Project Name
                    </Label>
                    <Input
                      id="project-name"
                      {...registerDetail("name")}
                      placeholder="Enter project name"
                      className="mt-1"
                    />
                    {errorsDetail.name && (
                      <div className="text-red-500 text-xs mt-1">
                        {errorsDetail.name.message}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-desc" className="font-semibold">
                      Description
                    </Label>
                    <Textarea
                      id="project-desc"
                      {...registerDetail("description")}
                      placeholder="Project description (optional)"
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Labels</Label>
                    <div className="flex gap-2 items-center mt-1">
                      <Input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        placeholder="Label name"
                        className="w-40"
                      />
                      {/* Color palette buttons */}
                      <div className="flex gap-1 ml-2 items-center">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                              labelColor === color
                                ? "border-black dark:border-white scale-110"
                                : "border-gray-300"
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Choose color ${color}`}
                            onClick={() => {
                              setLabelColor(color)
                              setShowColorPicker(false)
                            }}
                          >
                            {labelColor === color && (
                              <span className="block w-3 h-3 rounded-full border-2 border-white bg-white/30" />
                            )}
                          </button>
                        ))}
                        {/* Custom color picker button */}
                        <Popover
                          open={showColorPicker}
                          onOpenChange={setShowColorPicker}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                !colorPalette.includes(labelColor) ||
                                showColorPicker
                                  ? "border-black dark:border-white scale-110"
                                  : "border-gray-300"
                              }`}
                              style={{ background: labelColor }}
                              aria-label="Custom color"
                              onClick={() => setShowColorPicker((v) => !v)}
                            >
                              <span className="block w-3 h-3 rounded-full border border-gray-400 bg-white/30" />
                            </button>
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
                        onClick={addLabel}
                        disabled={!labelInput.trim()}
                        className="ml-2"
                      >
                        Add
                      </Button>
                    </div>
                    {errorsDetail.labels && (
                      <div className="text-red-500 text-xs mt-1">
                        {errorsDetail.labels.message}
                      </div>
                    )}
                    {watchedLabels.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {watchedLabels.map((label, idx) => (
                          <span
                            key={idx}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shadow-sm"
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
                              onClick={() => removeLabel(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="px-6 py-2 text-base font-semibold"
                    >
                      Next: Import Dataset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          {step === "dataset" && (
            <Card className="shadow-none border-none bg-transparent">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-2">
                  <Label className="font-semibold">Images</Label>
                  <div
                    className="mt-1 flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 dark:bg-gray-800 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-2 h-10 w-10 dark:text-gray-400 text-gray-500" />
                    <p className="text-sm font-medium dark:text-gray-300 text-gray-700">
                      {isUploading
                        ? "Processing..."
                        : "Drag and drop images, or click to browse"}
                    </p>
                    <p className="text-xs dark:text-gray-400 text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {images.length > 0 && (
                  <div>
                    <Label className="mb-2 block font-semibold">
                      Selected Images ({images.length})
                    </Label>
                    <div className="grid max-h-64 grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-1">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className="group relative rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
                        >
                          <img
                            src={image.data || "/placeholder.svg"}
                            alt={image.name}
                            className="h-28 w-full object-cover rounded-t-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 dark:bg-black/60 bg-black/50">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveImage(index)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-1 text-xs dark:bg-black/80 dark:text-gray-300 bg-black/70 text-white truncate">
                            {image.name.length > 20
                              ? `${image.name.substring(0, 20)}...`
                              : image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setStep("details")}
                    className="px-6 py-2 text-base font-semibold"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={isUploading || images.length === 0}
                    className="px-6 py-2 text-base font-semibold"
                  >
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      </div>
    </Card>
  )
}
