"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { X, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import type { Project, ImageData } from "@/lib/types"

interface ProjectManagerProps {
  onClose: () => void
  onProjectCreate: (project: Project) => void
}

export function ProjectManager({
  onClose,
  onProjectCreate,
}: ProjectManagerProps) {
  const { toast } = useToast()
  const [projectName, setProjectName] = useState("")
  const [images, setImages] = useState<ImageData[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

        newImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          data: imageData,
          width: dimensions.width,
          height: dimensions.height,
          projectId: "", // Will be set when project is created
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

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project",
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
      const projectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Assign project ID to all images
      const projectImages = images.map((img) => ({
        ...img,
        projectId,
      }))

      // Create project object
      const newProject: Project = {
        id: projectId,
        name: projectName.trim(),
        images: projectImages,
        createdAt: new Date(),
        lastModified: new Date(),
      }

      // Save to database
      await db.transaction("rw", db.projects, db.images, async () => {
        await db.projects.add(newProject)
        await db.images.bulkAdd(projectImages)
      })

      onProjectCreate(newProject)
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Create New Project</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Images</Label>
            <div
              className={`mt-1 flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                isUploading ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                {isUploading
                  ? "Processing..."
                  : "Drag and drop images, or click to browse"}
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
                    className="group relative rounded-md border border-gray-200"
                  >
                    <img
                      src={image.data || "/placeholder.svg"}
                      alt={image.name}
                      className="h-24 w-full rounded-md object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
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
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-white">
                      {image.name.length > 20
                        ? `${image.name.substring(0, 20)}...`
                        : image.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={
                isUploading || !projectName.trim() || images.length === 0
              }
            >
              Create Project
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
