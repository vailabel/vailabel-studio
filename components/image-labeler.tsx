"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { ArrowLeft, Save, Download, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Canvas } from "@/components/canvas"
import { Toolbar } from "@/components/toolbar"
import { Sidebar } from "@/components/sidebar"
import { LabelEditor } from "@/components/label-editor"
import { SettingsModal } from "@/components/settings-modal"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { useLabelStore } from "@/lib/store"
import { exportToJson } from "@/lib/utils"
import type { Project, Label } from "@/lib/types"

interface ImageLabelerProps {
  project: Project
  onClose: () => void
}

export function ImageLabeler({ project, onClose }: ImageLabelerProps) {
  const { toast } = useToast()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showLabelEditor, setShowLabelEditor] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [labeledCount, setLabeledCount] = useState(0)

  const { labels, setLabels, clearLabels } = useLabelStore()

  // Calculate how many images have labels
  useEffect(() => {
    const countLabeledImages = async () => {
      try {
        const imageIds = project.images.map((img) => img.id)
        const labeledImages = await db.labels.where("imageId").anyOf(imageIds).toArray()

        // Count unique imageIds that have labels
        const uniqueImageIds = new Set(labeledImages.map((label) => label.imageId))
        setLabeledCount(uniqueImageIds.size)
      } catch (error) {
        console.error("Failed to count labeled images:", error)
      }
    }

    countLabeledImages()
  }, [project.images, labels])

  // Load labels for the current image
  useEffect(() => {
    const loadLabels = async () => {
      if (!project.images.length) return

      try {
        const currentImage = project.images[currentImageIndex]
        const imageLabels = await db.labels.where("imageId").equals(currentImage.id).toArray()

        setLabels(imageLabels)
      } catch (error) {
        console.error("Failed to load labels:", error)
        toast({
          title: "Error",
          description: "Failed to load image labels",
          variant: "destructive",
        })
      }
    }

    loadLabels()
  }, [project.images, currentImageIndex, setLabels, toast])

  const handleSaveProject = async () => {
    setIsSaving(true)

    try {
      // Update project's lastModified date
      await db.projects.update(project.id, {
        lastModified: new Date(),
      })

      toast({
        title: "Success",
        description: "Project saved successfully",
      })
    } catch (error) {
      console.error("Failed to save project:", error)
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportProject = async () => {
    try {
      // Fetch all labels for this project
      const imageIds = project.images.map((img) => img.id)
      const allLabels = await db.labels.where("imageId").anyOf(imageIds).toArray()

      // Group labels by imageId
      const labelsByImage: Record<string, Label[]> = {}
      allLabels.forEach((label) => {
        if (!labelsByImage[label.imageId]) {
          labelsByImage[label.imageId] = []
        }
        labelsByImage[label.imageId].push(label)
      })

      // Create export data structure
      const exportData = {
        project: {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          lastModified: project.lastModified,
          imageCount: project.images.length,
        },
        images: project.images.map((img) => ({
          id: img.id,
          name: img.name,
          width: img.width,
          height: img.height,
          labels: labelsByImage[img.id] || [],
        })),
      }

      exportToJson(exportData, `${project.name.replace(/\s+/g, "-")}-export.json`)

      toast({
        title: "Success",
        description: "Project exported successfully",
      })
    } catch (error) {
      console.error("Failed to export project:", error)
      toast({
        title: "Error",
        description: "Failed to export project",
        variant: "destructive",
      })
    }
  }

  const handleNextImage = () => {
    if (currentImageIndex < project.images.length - 1) {
      clearLabels()
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      clearLabels()
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const handleLabelSelect = (label: Label) => {
    setSelectedLabel(label)
    setShowLabelEditor(true)
  }

  const handleLabelEditorClose = () => {
    setShowLabelEditor(false)
    setSelectedLabel(null)
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if no modals are open
      if (showSettings || showLabelEditor) return

      if (e.key === "n" || e.key === "N") {
        handleNextImage()
      } else if (e.key === "p" || e.key === "P") {
        handlePrevImage()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentImageIndex, project.images.length, showSettings, showLabelEditor])

  const currentImage = project.images[currentImageIndex]
  const progress = project.images.length > 0 ? Math.round((labeledCount / project.images.length) * 100) : 0

  return (
    <>
      <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
            <p className="text-sm text-gray-500">
              {labeledCount} of {project.images.length} images labeled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleSaveProject} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save project</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleExportProject}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export project as JSON</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          project={project}
          currentImageIndex={currentImageIndex}
          onImageSelect={setCurrentImageIndex}
          onLabelSelect={handleLabelSelect}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar />

          <div className="relative flex-1 overflow-hidden">
            {currentImage ? (
              <Canvas image={currentImage} labels={labels} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No images in this project</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevImage} disabled={currentImageIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextImage}
                  disabled={currentImageIndex === project.images.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>
                  Image {currentImageIndex + 1} of {project.images.length}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span>
                  {labeledCount} labeled ({progress}%)
                </span>
              </div>
            </div>

            <div className="mt-2">
              <Progress value={progress} className="h-1" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}</AnimatePresence>

      <AnimatePresence>
        {showLabelEditor && selectedLabel && <LabelEditor label={selectedLabel} onClose={handleLabelEditorClose} />}
      </AnimatePresence>
    </>
  )
}
