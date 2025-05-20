import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { X, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Project, ImageData } from "@vailabel/core"
import { useDataAccess } from "@/hooks/use-data-access"
import { useStorage } from "@/hooks/use-stoage"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SketchPicker, ColorResult } from "react-color"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// NOTE: You must run: yarn add react-color

interface ProjectManagerProps {
  onClose: () => void
  onProjectCreate: (project: Project) => void
}

// Extend Project type locally to support labels
interface ProjectWithLabels extends Project {
  labels: { name: string; color: string }[]
  description?: string
}

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

export function ProjectManager({
  onClose,
  onProjectCreate,
}: ProjectManagerProps) {
  const { toast } = useToast()
  const [images, setImages] = useState<ImageData[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [step, setStep] = useState<"details" | "dataset">("details")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createProject, createImage } = useDataAccess()
  const { saveImage } = useStorage()

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
          projectId: "temp", // will be replaced with real projectId later
          createdAt: new Date(),
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
    setShowColorPicker(false)
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
      const newProject: ProjectWithLabels = {
        id: projectId,
        name: details.name.trim(),
        images: [],
        createdAt: new Date(),
        lastModified: new Date(),
        labels: details.labels,
        description: details.description,
      }
      await createProject(newProject as Project)
      const projectImages = images.map((img) => ({ ...img, projectId }))
      for (const img of projectImages) {
        await createImage(img)
        await saveImage(img.id, img.data)
      }
      onProjectCreate({ ...newProject, images: projectImages })
    } catch {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center dark:bg-black/70 bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-3xl rounded-lg p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100 bg-white text-gray-900"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tabs value={step} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="details" onClick={() => setStep("details")}>
              Project Details
            </TabsTrigger>
            <TabsTrigger
              value="dataset"
              onClick={() => setStep("dataset")}
              disabled={!!errorsDetail.name || watchedLabels.length === 0}
            >
              Import Dataset
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <Card>
              <CardContent className="p-6">
                <form
                  onSubmit={handleSubmitDetail(() => setStep("dataset"))}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
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
                  <div>
                    <Label htmlFor="project-desc">Description</Label>
                    <Textarea
                      id="project-desc"
                      {...registerDetail("description")}
                      placeholder="Project description (optional)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Labels</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        placeholder="Label name"
                        className="w-40"
                      />
                      <Popover
                        open={showColorPicker}
                        onOpenChange={setShowColorPicker}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            style={{ backgroundColor: labelColor }}
                            className="w-8 h-8 p-0 border border-gray-300"
                            aria-label="Pick color"
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <SketchPicker
                            color={labelColor}
                            onChange={(color: ColorResult) =>
                              setLabelColor(color.hex)
                            }
                            disableAlpha
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        onClick={addLabel}
                        disabled={!labelInput.trim()}
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
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
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
                              className="ml-1 p-0 h-4 w-4"
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
                    <Button type="submit">Next: Import Dataset</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="dataset">
            <Card>
              <CardContent className="p-6">
                <div>
                  <Label>Images</Label>
                  <div
                    className="mt-1 flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed dark:border-gray-600 dark:bg-gray-700 border-gray-300"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-2 h-8 w-8 dark:text-gray-400 text-gray-500" />
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
                    <Label className="mb-2 block">
                      Selected Images ({images.length})
                    </Label>
                    <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto p-1">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className="group relative rounded-md border dark:border-gray-600 dark:bg-gray-700 border-gray-200"
                        >
                          <img
                            src={image.data || "/placeholder.svg"}
                            alt={image.name}
                            className="h-24 w-full rounded-md object-cover"
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
                          <div className="absolute bottom-0 left-0 right-0 p-1 text-xs dark:bg-black/80 dark:text-gray-300 bg-black/70 text-white">
                            {image.name.length > 20
                              ? `${image.name.substring(0, 20)}...`
                              : image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep("details")}>
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={isUploading || images.length === 0}
                  >
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
