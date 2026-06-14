import { memo, useCallback, useRef, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Canvas } from "@/components/canvas/canvas"
import { Toolbar } from "@/components/studio/toolbar"
import { LabelListPanel } from "@/components/studio/label-list-panel"
import { FileListPanel } from "@/components/studio/file-list-panel"
import { ResizablePanel } from "@/components/common/resizable-panel"
import { SettingsModal } from "@/components/settings/settings-modal"
import { AIModelSelectModal } from "@/components/ai/ai-model-modal"
import { ContextMenu } from "@/components/studio/context-menu"
import { ExportDialog } from "@/components/studio/export-dialog"
import { PredictionReviewPanel } from "@/components/ai/prediction-review-panel"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useStudioScreenViewModel } from "@/features/studio/use-studio-screen-viewmodel"
import type { Annotation, ImageData, Label, Prediction } from "@/types/core"

interface ImageLabelerProps {
  projectId?: string
  imageId?: string
}

const MemoizedCanvas = memo(
  ({
    image,
    annotations,
    predictions,
    labels,
    onCreateAnnotationDraft,
    onUpdateAnnotation,
    onDeleteAnnotation,
    onUndo,
    onRedo,
  }: {
    image: ImageData
    annotations: Annotation[]
    predictions: Prediction[]
    labels: Label[]
    onCreateAnnotationDraft: (draft: {
      name: string
      color: string
      type: string
      coordinates: Array<{ x: number; y: number }>
    }) => Promise<void>
    onUpdateAnnotation: (
      annotationId: string,
      updates: Partial<Annotation>
    ) => Promise<void>
    onDeleteAnnotation: (annotationId: string) => Promise<void>
    onUndo: () => Promise<void> | void
    onRedo: () => Promise<void> | void
  }) => (
    <Canvas
      image={image}
      annotations={annotations}
      predictions={predictions}
      labels={labels}
      onCreateAnnotationDraft={onCreateAnnotationDraft}
      onUpdateAnnotation={onUpdateAnnotation}
      onDeleteAnnotation={onDeleteAnnotation}
      onUndo={onUndo}
      onRedo={onRedo}
    />
  )
)

MemoizedCanvas.displayName = "MemoizedCanvas"

const EmptyImageState = memo(() => (
  <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
    <p className="text-gray-500 dark:text-gray-400">No images in this project</p>
  </div>
))

EmptyImageState.displayName = "EmptyImageState"

export const ImageLabeler = memo(({ projectId, imageId }: ImageLabelerProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const viewModel = useStudioScreenViewModel(projectId, imageId)

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()

      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect()
        viewModel.setContainer({ width: rect.width, height: rect.height })
      }

      viewModel.openContextMenu({ x: event.clientX, y: event.clientY })
      return false
    },
    [viewModel]
  )

  const handleLabelSelect = useCallback(
    (label: Label) => {
      if (!viewModel.selectedAnnotation) return

      void viewModel.updateAnnotation(viewModel.selectedAnnotation.id, {
        name: label.name,
        color: label.color,
        labelId: label.id,
        label_id: label.id,
      })
    },
    [viewModel]
  )

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <StudioHeader
        projectName={viewModel.project?.name || "Project"}
        projectStats={viewModel.projectStats}
        hasNext={viewModel.hasNext}
        hasPrevious={viewModel.hasPrevious}
        isLoading={viewModel.isProjectSummaryLoading}
        onBack={viewModel.navigateBackToProjects}
        onNext={viewModel.goToNextImage}
        onPrevious={viewModel.goToPreviousImage}
        onOpenSettings={viewModel.openSettingsModal}
        onExport={() => setShowExportDialog(true)}
        isExporting={viewModel.isExporting}
      />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel
          direction="horizontal"
          controlPosition="right"
          defaultSize={240}
          minSize={180}
          maxSize={360}
          className="h-full"
        >
          <FileListPanel
            images={viewModel.projectImages}
            currentImageId={viewModel.currentImageId}
            annotatedImageIds={viewModel.annotatedImageIds}
            onSelectImage={viewModel.navigateToImage}
            isLoading={viewModel.isProjectSummaryLoading}
          />
        </ResizablePanel>

        <div
          role="button"
          ref={canvasContainerRef}
          className="relative flex flex-1 flex-col overflow-hidden"
          onContextMenu={handleContextMenu}
          onClick={viewModel.closeContextMenu}
        >
          <Toolbar
            currentImage={viewModel.data.image}
            selectedTool={viewModel.selectedTool}
            onSelectTool={viewModel.setSelectedTool}
            zoom={viewModel.zoom}
            onZoomIn={viewModel.zoomIn}
            onZoomOut={viewModel.zoomOut}
            onResetView={viewModel.resetView}
            showCrosshair={viewModel.showCrosshair}
            showCoordinates={viewModel.showCoordinates}
            onToggleCrosshair={viewModel.toggleCrosshair}
            onToggleCoordinates={viewModel.toggleCoordinates}
            canUndo={viewModel.canUndo}
            canRedo={viewModel.canRedo}
            onUndo={viewModel.undo}
            onRedo={viewModel.redo}
            selectedModel={viewModel.selectedModel}
            selectedModelId={viewModel.selectedModelId}
            selectedModelPredictionReady={viewModel.selectedModelPredictionReady}
            selectedModelCanAttemptPrediction={
              viewModel.selectedModelCanAttemptPrediction
            }
            selectedModelWillConvertOnRun={viewModel.selectedModelWillConvertOnRun}
            selectedModelUnsupportedReason={
              viewModel.selectedModelUnsupportedReason
            }
            selectedModelReadinessLabel={viewModel.selectedModelReadinessLabel}
            onOpenAISettings={viewModel.openAIModelModal}
            onGeneratePredictions={viewModel.generatePredictions}
            isGeneratingPredictions={viewModel.isGeneratingPredictions}
          />

          <div className="relative flex-1 overflow-hidden">
            {viewModel.data.image ? (
              <MemoizedCanvas
                image={viewModel.data.image}
                annotations={viewModel.data.annotations}
                predictions={viewModel.data.predictions}
                labels={viewModel.data.labels}
                onCreateAnnotationDraft={viewModel.createAnnotationFromDraft}
                onUpdateAnnotation={viewModel.updateAnnotation}
                onDeleteAnnotation={viewModel.deleteAnnotation}
                onUndo={viewModel.undo}
                onRedo={viewModel.redo}
              />
            ) : (
              <EmptyImageState />
            )}

            <PredictionReviewPanel
              predictions={viewModel.data.predictions}
              labels={viewModel.data.labels}
              onAccept={viewModel.acceptPrediction}
              onReject={viewModel.rejectPrediction}
            />

            {viewModel.contextMenu.visible ? (
              <ContextMenu
                x={viewModel.contextMenu.x}
                y={viewModel.contextMenu.y}
                image={viewModel.data.image}
                selectedModelId={viewModel.selectedModelId}
                selectedModelCanAttemptPrediction={
                  viewModel.selectedModelCanAttemptPrediction
                }
                selectedModelUnsupportedReason={
                  viewModel.selectedModelUnsupportedReason
                }
                onGeneratePredictions={viewModel.generatePredictions}
                onOpenAISettings={viewModel.openAIModelModal}
                onSelectTool={viewModel.setSelectedTool}
                onResetView={viewModel.resetView}
                containerRect={
                  canvasContainerRef.current?.getBoundingClientRect() || null
                }
                onClose={viewModel.closeContextMenu}
              />
            ) : null}
          </div>
        </div>

        <ResizablePanel
          direction="horizontal"
          controlPosition="left"
          defaultSize={280}
          minSize={200}
          maxSize={400}
          className="h-full"
        >
          <LabelListPanel
            onLabelSelect={handleLabelSelect}
            labels={viewModel.data.labels}
            isLoading={viewModel.data.isLoading}
          />
        </ResizablePanel>
      </div>

      {viewModel.showSettingsModal ? (
        <SettingsModal onClose={viewModel.closeSettingsModal} />
      ) : null}
      {viewModel.showAIModelModal ? (
        <AIModelSelectModal onClose={viewModel.closeAIModelModal} />
      ) : null}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={viewModel.exportProject}
        isExporting={viewModel.isExporting}
      />
    </div>
  )
})

ImageLabeler.displayName = "ImageLabeler"

const StudioHeader = memo(
  ({
    projectName,
    projectStats,
    hasNext,
    hasPrevious,
    isLoading,
    onBack,
    onNext,
    onPrevious,
    onOpenSettings,
    onExport,
    isExporting,
  }: {
    projectName: string
    projectStats: {
      totalImages: number
      labeledImages: number
      totalLabels: number
    }
    hasNext: boolean
    hasPrevious: boolean
    isLoading: boolean
    onBack: () => void
    onNext: () => void
    onPrevious: () => void
    onOpenSettings: () => void
    onExport: () => void | Promise<void>
    isExporting: boolean
  }) => {
    const progress =
      projectStats.totalImages > 0
        ? Math.round((projectStats.labeledImages / projectStats.totalImages) * 100)
        : 0

    return (
      <header className="flex justify-between border-b border-gray-200 bg-white px-4 py-1 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex min-w-[250px] items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {projectName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading
                ? "Loading project stats..."
                : `${projectStats.labeledImages} of ${projectStats.totalImages} images labeled`}
            </p>
          </div>
        </div>

        <div className="w-full p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    Previous image
                    <kbd className="ml-2 rounded border border-gray-200 bg-gray-100 px-1.5 text-xs dark:border-gray-700 dark:bg-gray-800">
                      Left Arrow
                    </kbd>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    Next image
                    <kbd className="ml-2 rounded border border-gray-200 bg-gray-100 px-1.5 text-xs dark:border-gray-700 dark:bg-gray-800">
                      Right Arrow
                    </kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {projectStats.totalLabels} labels / {progress}% complete
              </span>
              <Separator orientation="vertical" className="h-4" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" onClick={() => void onExport()} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                }
              />
              <TooltipContent>
                Export annotations to LabelMe, COCO, YOLO, or Pascal VOC.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="icon" onClick={onOpenSettings}>
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>
    )
  }
)

StudioHeader.displayName = "StudioHeader"
