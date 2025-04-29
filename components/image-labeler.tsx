"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Save,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Canvas } from "@/components/canvas"
import { Toolbar } from "@/components/toolbar"
import { ImageList } from "@/components/image-list"
import { LabelListPanel } from "@/components/label-list-panel"
import { ResizablePanel } from "@/components/resizable-panel"
import { LabelEditor } from "@/components/label-editor"
import { SettingsModal } from "@/components/settings-modal"
import { ExportModal } from "@/components/export-modal"
import { AIModelModal } from "@/components/ai-model-modal"
import { ContextMenu } from "@/components/context-menu"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { useLabelStore } from "@/lib/store"
import { useSettingsStore } from "@/lib/settings-store"
import type { Project, Label } from "@/lib/types"

interface ImageLabelerProps {
  project: Project
  onClose: () => void
}

export function ImageLabeler({ project, onClose }: ImageLabelerProps) {
  const { toast } = useToast()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showLabelEditor, setShowLabelEditor] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [labeledCount, setLabeledCount] = useState(0)
  const [contextMenuProps, setContextMenuProps] = useState({
    isOpen: false,
    x: 0,
    y: 0,
  })

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  const { labels, setLabels, clearLabels } = useLabelStore()
  const { darkMode, setDarkMode } = useSettingsStore()

  // Calculate how many images have labels
  useEffect(() => {
    const countLabeledImages = async () => {
      try {
        const imageIds = project.images.map((img) => img.id)
        const labeledImages = await db.labels
          .where("imageId")
          .anyOf(imageIds)
          .toArray()

        // Count unique imageIds that have labels
        const uniqueImageIds = new Set(
          labeledImages.map((label) => label.imageId)
        )
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
        const imageLabels = await db.labels
          .where("imageId")
          .equals(currentImage.id)
          .toArray()

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

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

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

  const handleExportProject = () => {
    setShowExport(true)
  }

  // Update the handleNextImage and handlePrevImage functions to properly save labels before changing images
  const handleNextImage = async () => {
    if (currentImageIndex < project.images.length - 1) {
      // Save current labels to database before changing images
      try {
        const currentImage = project.images[currentImageIndex]
        const nextImage = project.images[currentImageIndex + 1]

        // Update project's lastModified date
        await db.projects.update(project.id, {
          lastModified: new Date(),
        })

        // Clear labels and load the next image's labels
        clearLabels()
        setCurrentImageIndex(currentImageIndex + 1)
      } catch (error) {
        console.error("Failed to save labels before changing image:", error)
        toast({
          title: "Error",
          description: "Failed to save labels",
          variant: "destructive",
        })
      }
    }
  }

  const handlePrevImage = async () => {
    if (currentImageIndex > 0) {
      // Save current labels to database before changing images
      try {
        const currentImage = project.images[currentImageIndex]
        const prevImage = project.images[currentImageIndex - 1]

        // Update project's lastModified date
        await db.projects.update(project.id, {
          lastModified: new Date(),
        })

        // Clear labels and load the previous image's labels
        clearLabels()
        setCurrentImageIndex(currentImageIndex - 1)
      } catch (error) {
        console.error("Failed to save labels before changing image:", error)
        toast({
          title: "Error",
          description: "Failed to save labels",
          variant: "destructive",
        })
      }
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

  // Handle right-click for context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    // Update container rect for accurate positioning
    if (canvasContainerRef.current) {
      setContainerRect(canvasContainerRef.current.getBoundingClientRect())
    }

    setContextMenuProps({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    })

    return false
  }

  // Close context menu when clicking elsewhere
  const handleCloseContextMenu = () => {
    setContextMenuProps((prev) => ({ ...prev, isOpen: false }))
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if no modals are open
      if (showSettings || showLabelEditor || showExport || showAISettings)
        return

      if (e.key === "n" || e.key === "N") {
        handleNextImage()
      } else if (e.key === "p" || e.key === "P") {
        handlePrevImage()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    currentImageIndex,
    project.images.length,
    showSettings,
    showLabelEditor,
    showExport,
    showAISettings,
  ])

  const currentImage = project.images[currentImageIndex]
  const progress =
    project.images.length > 0
      ? Math.round((labeledCount / project.images.length) * 100)
      : 0

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between border-b p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {project.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {labeledCount} of {project.images.length} images labeled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDarkMode(!darkMode)}
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {darkMode ? "Light mode" : "Dark mode"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleSaveProject}
                  disabled={isSaving}
                >
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
              <TooltipContent>Export project in various formats</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Image list */}
        <ResizablePanel
          direction="horizontal"
          controlPosition="right"
          defaultSize={280}
          minSize={200}
          maxSize={400}
          className="h-full"
        >
          <ImageList
            project={project}
            currentImageIndex={currentImageIndex}
            onImageSelect={setCurrentImageIndex}
          />
        </ResizablePanel>

        {/* Middle panel - Canvas */}
        <div
          ref={canvasContainerRef}
          className="flex flex-1 flex-col overflow-hidden relative"
          onContextMenu={handleContextMenu}
          onClick={handleCloseContextMenu}
        >
          <Toolbar
            currentImage={currentImage}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAISettings={() => setShowAISettings(true)}
          />

          <div className="relative flex-1 overflow-hidden">
            {currentImage ? (
              <Canvas image={currentImage} labels={labels} />
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">
                  No images in this project
                </p>
              </div>
            )}

            <AnimatePresence>
              {contextMenuProps.isOpen && (
                <ContextMenu
                  x={contextMenuProps.x}
                  y={contextMenuProps.y}
                  containerRect={containerRect}
                  onClose={handleCloseContextMenu}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="border-t p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevImage}
                  disabled={currentImageIndex === 0}
                >
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

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
              <Progress
                value={progress}
                className="h-1 bg-gray-200 dark:bg-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Right panel - Label list */}
        <ResizablePanel
          direction="horizontal"
          controlPosition="left"
          defaultSize={280}
          minSize={200}
          maxSize={400}
          className="h-full"
        >
          <LabelListPanel onLabelSelect={handleLabelSelect} />
        </ResizablePanel>
      </div>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExport && (
          <ExportModal
            project={project}
            labels={labels}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAISettings && (
          <AIModelModal onClose={() => setShowAISettings(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLabelEditor && selectedLabel && (
          <LabelEditor label={selectedLabel} onClose={handleLabelEditorClose} />
        )}
      </AnimatePresence>
    </div>
  )
}
