import type React from "react"
import type { ImageData, Project, Label } from "@vailabel/core"
import { useState, useEffect, useRef, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Canvas } from "@/components/canvas"
import { Toolbar } from "@/components/toolbar"
import { LabelListPanel } from "@/components/label-list-panel"
import { ResizablePanel } from "@/components/resizable-panel"
import { SettingsModal } from "@/components/settings-modal"
import { ExportModal } from "@/components/export-modal"
import { AIModelSelectModal } from "@/components/ai-model-modal"
import { ContextMenu } from "@/components/context-menu"
import { ThemeToggle } from "./theme-toggle"
import { useDataAccess } from "@/hooks/use-data-access"
import { useAnnotations } from "@/hooks/use-annotations"
import { useNavigate } from "react-router-dom"

interface ImageLabelerProps {
  project: Project
  imageId?: string
  onClose: () => void
}

export function ImageLabeler({ project, imageId, onClose }: ImageLabelerProps) {
  const navigate = useNavigate()
  const dataAccess = useDataAccess()
  const [showSettings, setShowSettings] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showLabelEditor, setShowLabelEditor] = useState(false)
  const [, setSelectedLabel] = useState<Label | null>(null)
  const [contextMenuProps, setContextMenuProps] = useState({
    isOpen: false,
    x: 0,
    y: 0,
  })
  const { currentImage, setCurrentImage, setAnnotations, annotations } =
    useAnnotations()
  const [images, setImages] = useState<ImageData[]>([])

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  const nextImage = useCallback(() => {
    if (images.length === 0) return

    const currentIndex = images.findIndex((img) => img.id === currentImage?.id)
    const nextIndex = (currentIndex + 1) % images.length
    const nextImage = images[nextIndex]

    setCurrentImage(nextImage)
    navigate(`/projects/${project.id}/studio/${nextImage.id}`)
  }, [images, setCurrentImage, navigate, project.id, currentImage?.id])

  const previousImage = useCallback(() => {
    if (images.length === 0) return

    const currentIndex = images.findIndex((img) => img.id === currentImage?.id)
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    const prevImage = images[prevIndex]

    setCurrentImage(prevImage)
    navigate(`/projects/${project.id}/studio/${prevImage.id}`)
  }, [images, setCurrentImage, navigate, project.id, currentImage?.id])

  useEffect(() => {
    if (imageId) {
      const fetchImagesAndSetCurrentImage = async () => {
        const images = await dataAccess.getImages(project.id)
        setImages(images)
        const currentImage = images.find((img) => img.id === imageId) as
          | ImageData
          | undefined
        if (currentImage) {
          setCurrentImage(currentImage)
        }
      }
      fetchImagesAndSetCurrentImage()
    }
  }, [project.id, imageId, dataAccess, setCurrentImage])

  useEffect(() => {
    const fetchAnnotationsOnFirstRender = async () => {
      if (currentImage) {
        const annotationsData = await dataAccess.getAnnotations(currentImage.id)
        setAnnotations(annotationsData)
      }
    }
    fetchAnnotationsOnFirstRender()
  }, [currentImage, setAnnotations, dataAccess])

  const handleExportProject = () => {
    setShowExport(true)
  }

  const handleLabelSelect = (label: Label) => {
    setSelectedLabel(label)
    setShowLabelEditor(true)
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

      if (e.key === "ArrowRight" || e.code === "ArrowRight") {
        nextImage()
      } else if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
        previousImage()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    currentImage?.id,
    images.length,
    showSettings,
    showLabelEditor,
    showExport,
    showAISettings,
    nextImage,
    previousImage,
  ])

  // Calculate progress: count images that have at least one annotation
  const [imageAnnotationMap, setImageAnnotationMap] = useState<
    Record<string, number>
  >({})

  useEffect(() => {
    // Build a map of imageId -> annotation count
    const fetchAllAnnotationCounts = async () => {
      if (images.length === 0) return
      const map: Record<string, number> = {}
      for (const img of images) {
        const anns = await dataAccess.getAnnotations(img.id)
        map[img.id] = anns.length
      }
      setImageAnnotationMap(map)
    }
    fetchAllAnnotationCounts()
  }, [images, dataAccess])

  const labeledCount = Object.values(imageAnnotationMap).filter(
    (count) => count > 0
  ).length
  const overallProgress =
    images.length > 0 ? Math.round((labeledCount / images.length) * 100) : 0

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex justify-between border-b px-4 py-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 min-w-[250px]">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {project.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {labeledCount} of {images.length} images labeled
            </p>
          </div>
        </div>
        <div className="p-4 w-full ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={previousImage}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Previous image
                    <kbd className="ml-2 rounded border px-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 border-gray-200 bg-gray-100">
                      Left Arrow
                    </kbd>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={nextImage}>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Next image
                    <kbd className="ml-2 rounded border px-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 border-gray-200 bg-gray-100">
                      Right Arrow
                    </kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {labeledCount} labeled ({overallProgress}%)
              </span>
              <Separator orientation="vertical" className="h-4" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />

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
          <LabelListPanel onLabelSelect={handleLabelSelect} />
        </ResizablePanel>

        {/* Middle panel - Canvas */}
        <div
          role="button"
          ref={canvasContainerRef}
          className="flex flex-1 flex-col overflow-hidden relative"
          onContextMenu={handleContextMenu}
          onClick={handleCloseContextMenu}
        >
          <Toolbar
            currentImage={currentImage || null}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAISettings={() => setShowAISettings(true)}
          />

          <div className="relative flex-1 overflow-hidden">
            {currentImage ? (
              <Canvas image={currentImage} annotations={annotations} />
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
        </div>
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
            annotations={annotations}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAISettings && (
          <AIModelSelectModal onClose={() => setShowAISettings(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
