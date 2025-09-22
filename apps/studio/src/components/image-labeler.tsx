import React, { useState, useEffect, useMemo, memo, useCallback } from "react"
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
import { Canvas } from "@/components/canvas/canvas"
import { Toolbar } from "@/components/toolbar"
import { LabelListPanel } from "@/components/label-list-panel"
import { ResizablePanel } from "@/components/resizable-panel"
import { SettingsModal } from "@/components/settings-modal"
import { AIModelSelectModal } from "@/components/ai-model-modal"
import { ContextMenu } from "@/components/context-menu"
import { ThemeToggle } from "./theme-toggle"
import { useNavigate } from "react-router-dom"
import { useCanvasContextMenu, useCanvasContainer } from "@/contexts/canvas-context"
import { useServices } from "@/services/ServiceProvider"
import { ImageData } from "@vailabel/core"
import { Annotation } from "@vailabel/core"

interface ImageLabelerProps {
  projectId?: string
  imageId?: string
}

// Memoized Toolbar wrapper to prevent unnecessary re-renders
const MemoizedToolbar = memo(({ image }: { image: ImageData | null }) => (
  <Toolbar
    currentImage={image}
    onOpenSettings={() => {}}
    onOpenAISettings={() => {}}
  />
))

MemoizedToolbar.displayName = "MemoizedToolbar"

// Memoized Canvas wrapper
const MemoizedCanvas = memo(
  ({ image, annotations, onRefreshAnnotations }: { 
    image: ImageData; 
    annotations: Annotation[];
    onRefreshAnnotations: () => Promise<void>;
  }) => (
    <Canvas image={image} annotations={annotations} onRefreshAnnotations={onRefreshAnnotations} />
  )
)

MemoizedCanvas.displayName = "MemoizedCanvas"

// Memoized Empty State component
const EmptyImageState = memo(() => (
  <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
    <p className="text-gray-500 dark:text-gray-400">
      No images in this project
    </p>
  </div>
))

EmptyImageState.displayName = "EmptyImageState"

// Memoized LabelListPanel wrapper
const MemoizedLabelListPanel = memo(({ projectId }: { projectId: string }) => (
  <LabelListPanel onLabelSelect={() => {}} projectId={projectId} />
))

MemoizedLabelListPanel.displayName = "MemoizedLabelListPanel"

export const ImageLabeler = memo(
  ({ projectId, imageId }: ImageLabelerProps) => {
    const { contextMenuProps, setContextMenuProps } = useCanvasContextMenu()
    const { canvasContainerRef, containerRect, setContainerRect } = useCanvasContainer()
    const services = useServices()

    const [image, setImage] = useState<ImageData | null>(null)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const navigate = useNavigate()

    // Function to refresh annotations for the current image
    const refreshAnnotations = useCallback(async () => {
      if (!imageId) return
      try {
        const updatedAnnotations = await services.getAnnotationService().getAnnotationsByImageId(imageId)
        setAnnotations(updatedAnnotations)
      } catch (error) {
        console.error("Failed to refresh annotations:", error)
      }
    }, [imageId, services])

    const [nextId, setNextId] = useState<string | null>(null)
    const [prevId, setPrevId] = useState<string | null>(null)
    const [hasNext, setHasNext] = useState(false)
    const [hasPrevious, setHasPrevious] = useState(false)

    // Memoize the image loading effect to prevent unnecessary calls
    useEffect(() => {
      let isCancelled = false
      ;(async () => {
        if (!projectId || !imageId) return
        const img = await services.getImageDataService().getImageById(imageId)
        if (!isCancelled) {
          if (img) {
            setImage(img)
            setAnnotations(img.annotations || [])
          } else {
            setImage(null)
            setAnnotations([])
          }
        }

        // update navigation state (next/previous)
        try {
          const next = await services.getProjectService().getNextImage(projectId, imageId)
          if (!isCancelled) {
            setNextId(next?.id ?? null)
            setHasNext(Boolean(next?.hasNext && next?.id))
          }
        } catch {
          if (!isCancelled) {
            setNextId(null)
            setHasNext(false)
          }
        }

        try {
          const prev = await services.getProjectService().getPreviousImage(projectId, imageId)
          if (!isCancelled) {
            setPrevId(prev?.id ?? null)
            setHasPrevious(Boolean(prev?.hasPrevious && prev?.id))
          }
        } catch {
          if (!isCancelled) {
            setPrevId(null)
            setHasPrevious(false)
          }
        }
      })()

      return () => {
        isCancelled = true
      }
    }, [
      projectId,
      imageId,
      services,
      setAnnotations,
    ])

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        // Only update containerRect if it's null or context menu is not open
        // This prevents unnecessary updates during window resize
        if (canvasContainerRef.current && (!containerRect || !contextMenuProps.isOpen)) {
          setContainerRect(canvasContainerRef.current.getBoundingClientRect())
        }
        setContextMenuProps({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
        })
        return false
      },
      [canvasContainerRef, setContainerRect, setContextMenuProps, containerRect, contextMenuProps.isOpen]
    )

    const handleCloseContextMenu = useCallback(() => {
      setContextMenuProps({
        isOpen: false,
        x: 0,
        y: 0,
      })
    }, [setContextMenuProps])

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight" || e.code === "ArrowRight") {
          if (hasNext && nextId)
            navigate(`/projects/${projectId}/studio/${nextId}`)
        } else if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
          if (hasPrevious && prevId)
            navigate(`/projects/${projectId}/studio/${prevId}`)
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [hasNext, hasPrevious, nextId, prevId, navigate, projectId])

    const goNextImage = useCallback(async () => {
      if (!projectId || !imageId) return
      if (hasNext && nextId) {
        navigate(`/projects/${projectId}/studio/${nextId}`)
        return
      }
      try {
        const next = await services.getProjectService().getNextImage(projectId, imageId)
        if (next?.id) navigate(`/projects/${projectId}/studio/${next.id}`)
      } catch {
        // ignore
      }
    }, [projectId, imageId, hasNext, nextId, navigate])

    const goPreviousImage = useCallback(async () => {
      if (!projectId || !imageId) return
      if (hasPrevious && prevId) {
        navigate(`/projects/${projectId}/studio/${prevId}`)
        return
      }
      try {
        const prev = await services.getProjectService().getPreviousImage(projectId, imageId)
        if (prev?.id) navigate(`/projects/${projectId}/studio/${prev.id}`)
      } catch {
        // ignore
      }
    }, [projectId, imageId, hasPrevious, prevId, navigate])

    // Memoize the header props to prevent unnecessary re-renders
    const headerProps = useMemo(
      () => ({
        onNext: goNextImage,
        onPrevious: goPreviousImage,
        hasNext,
        hasPrevious,
        projectId,
      }),
      [goNextImage, goPreviousImage, hasNext, hasPrevious, projectId]
    )

    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header {...headerProps} />
        <div className="flex flex-1 overflow-hidden">
          <ResizablePanel
            direction="horizontal"
            controlPosition="right"
            defaultSize={280}
            minSize={200}
            maxSize={400}
            className="h-full"
          >
            {projectId && <MemoizedLabelListPanel projectId={projectId} />}
          </ResizablePanel>
          <div
            role="button"
            ref={canvasContainerRef}
            className="flex flex-1 flex-col overflow-hidden relative"
            onContextMenu={handleContextMenu}
            onClick={handleCloseContextMenu}
          >
            <MemoizedToolbar image={image} />

            <div className="relative flex-1 overflow-hidden">
              {image ? (
                <MemoizedCanvas image={image} annotations={annotations} onRefreshAnnotations={refreshAnnotations} />
              ) : (
                <EmptyImageState />
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
        {/* <AnimatePresence>
        {showExport && (
          <ExportModal
            project={project}
            annotations={annotations}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence> */}
      </div>
    )
  }
)

const Header = memo(
  ({
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    projectId,
  }: {
    onNext: () => void
    onPrevious: () => void
    hasNext: boolean
    hasPrevious: boolean
    projectId?: string
  }) => {
    const services = useServices()
    const navigate = useNavigate()
    const [currentProject, setCurrentProject] = useState<{ id: string; name: string; labelCount: number; imageCount: number } | null>(null)
    
    // Load project data
    useEffect(() => {
      const loadProject = async () => {
        if (projectId) {
          try {
            const project = await services.getProjectService().getProject(projectId)
            if (project) {
              setCurrentProject({
                id: project.id,
                name: project.name,
                labelCount: project.labelCount || 0,
                imageCount: project.imageCount || 0
              })
            }
          } catch (error) {
            console.error("Failed to load project:", error)
          }
        }
      }
      loadProject()
    }, [projectId])
    
    const projectName = useMemo(
      () => currentProject?.name || "Project Name",
      [currentProject?.name]
    )
    const labelCount = useMemo(
      () => currentProject?.labelCount || 0,
      [currentProject?.labelCount]
    )
    const imageCount = useMemo(
      () => currentProject?.imageCount || 0,
      [currentProject?.imageCount]
    )

    const onClose = () => {
      navigate("/projects")
    }

    const handleExportProject = () => {
      setShowExport(true)
    }

    const [showSettings, setShowSettings] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setShowExport] = useState(false)
    const [showAISettings, setShowAISettings] = useState(false)

    const [localImageCount, setLocalImageCount] = useState<number>(imageCount)
    const [localLabelCount, setLocalLabelCount] = useState<number>(labelCount)

    useEffect(() => {
      let cancelled = false
      ;(async () => {
        const projectId = currentProject?.id
        if (!projectId) {
          setLocalImageCount(0)
          setLocalLabelCount(0)
          return
        }

        // try using cached id list first
        // Note: imageIdListCache would need to be implemented in the service layer
        try {
          const imgs = await services.getImageDataService().getImagesByProjectId(projectId)
          if (!cancelled) setLocalImageCount(imgs.length)
        } catch {
          if (!cancelled) setLocalImageCount(0)
        }

        try {
          const annotations: Annotation[] = await services.getAnnotationService().getAnnotationsByProjectId(projectId)
          const unique = new Set(annotations.map((a: Annotation) => a.imageId))
          if (!cancelled) setLocalLabelCount(unique.size)
        } catch {
          if (!cancelled) setLocalLabelCount(0)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [currentProject?.id])
    return (
      <header className="flex justify-between border-b px-4 py-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 min-w-[250px]">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {projectName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {labelCount} of {imageCount} images labeled
            </p>
          </div>
        </div>
        <div className="p-4 w-full ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPrevious}
                      disabled={!hasPrevious}
                    >
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNext}
                      disabled={!hasNext}
                    >
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
                {localLabelCount} labeled (
                {localImageCount > 0
                  ? Math.round((localLabelCount / localImageCount) * 100)
                  : 0}
                %)
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
        <AnimatePresence>
          {showSettings && (
            <SettingsModal onClose={() => setShowSettings(false)} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showAISettings && (
            <AIModelSelectModal onClose={() => setShowAISettings(false)} />
          )}
        </AnimatePresence>
      </header>
    )
  }
)
