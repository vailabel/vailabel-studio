import React, {
  useState,
  useEffect,
  useMemo,
  memo,
  useCallback,
  useRef,
} from "react"
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
import {
  useCanvasContextMenu,
  useCanvasContainer,
} from "@/contexts/canvas-context"
import { useImageLabelerViewModel } from "@/viewmodels/image-labeler-viewmodel"
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
  ({
    image,
    annotations,
    onRefreshAnnotations,
  }: {
    image: ImageData
    annotations: Annotation[]
    onRefreshAnnotations: () => Promise<void>
  }) => (
    <Canvas
      image={image}
      annotations={annotations}
      onRefreshAnnotations={onRefreshAnnotations}
    />
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
    const { contextMenu, setContextMenu } = useCanvasContextMenu()
    const { container, setContainer } = useCanvasContainer()
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const {
      image,
      annotations,
      nextId,
      prevId,
      hasNext,
      hasPrevious,
      refreshAnnotations,
      goToNextImage,
      goToPreviousImage,
    } = useImageLabelerViewModel(projectId, imageId)
    const navigate = useNavigate()

    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showAIModelModal, setShowAIModelModal] = useState(false)

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        // Only update container if it's null or context menu is not open
        // This prevents unnecessary updates during window resize
        if (
          canvasContainerRef.current &&
          (!container || !contextMenu.visible)
        ) {
          const rect = canvasContainerRef.current.getBoundingClientRect()
          setContainer({ width: rect.width, height: rect.height })
        }
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: "Next Image",
              onClick: () => goToNextImage(),
              disabled: !hasNext,
            },
            {
              label: "Previous Image",
              onClick: () => goToPreviousImage(),
              disabled: !hasPrevious,
            },
            { type: "separator" },
            { label: "Settings", onClick: () => setShowSettingsModal(true) },
          ],
        })
        return false
      },
      [
        canvasContainerRef,
        setContainer,
        setContextMenu,
        container,
        contextMenu.visible,
        goToNextImage,
        goToPreviousImage,
        hasNext,
        hasPrevious,
      ]
    )

    const handleCloseContextMenu = useCallback(() => {
      setContextMenu({
        visible: false,
        x: 0,
        y: 0,
        items: [],
      })
    }, [setContextMenu])

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
      if (hasNext && nextId) {
        navigate(`/projects/${projectId}/studio/${nextId}`)
        return
      }
      goToNextImage()
    }, [hasNext, nextId, navigate, projectId, goToNextImage])

    const goPreviousImage = useCallback(async () => {
      if (hasPrevious && prevId) {
        navigate(`/projects/${projectId}/studio/${prevId}`)
        return
      }
      goToPreviousImage()
    }, [hasPrevious, prevId, navigate, projectId, goToPreviousImage])

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
                <MemoizedCanvas
                  image={image || null}
                  annotations={annotations}
                  onRefreshAnnotations={async () => {
                    await refreshAnnotations()
                  }}
                />
              ) : (
                <EmptyImageState />
              )}

              <AnimatePresence>
                {contextMenu.visible && (
                  <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    containerRect={
                      canvasContainerRef.current?.getBoundingClientRect() ||
                      null
                    }
                    onClose={handleCloseContextMenu}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}
        {showAIModelModal && (
          <AIModelSelectModal onClose={() => setShowAIModelModal(false)} />
        )}
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
    const navigate = useNavigate()
    const [currentProject, setCurrentProject] = useState<{
      id: string
      name: string
      labelCount: number
      imageCount: number
    } | null>(null)

    // Load project data
    useEffect(() => {
      const loadProject = async () => {
        if (projectId) {
          try {
            // TODO: Load project data
            // TODO: Set project data when available
            setCurrentProject(null)
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
        // TODO: Load project statistics
        if (!cancelled) {
          setLocalImageCount(0)
          setLocalLabelCount(0)
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
