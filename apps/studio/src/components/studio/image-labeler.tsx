import { memo, useCallback, useMemo, useRef, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2, Settings, Sparkles } from "lucide-react"
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
import { ClassificationPanel } from "@/components/studio/classification-panel"
import { LabelListPanel } from "@/components/studio/label-list-panel"
import { FileListPanel } from "@/components/studio/file-list-panel"
import { ResizablePanel } from "@/components/common/resizable-panel"
import { SettingsModal } from "@/components/settings/settings-modal"
import { ContextMenu } from "@/components/studio/context-menu"
import { ExportDialog } from "@/components/studio/export-dialog"
import { PredictionReviewPanel } from "@/components/ai/prediction-review-panel"
import { AiCopilotPanel } from "@/components/ai/ai-copilot-panel"
import { AutoLabelControls } from "@/components/ai/auto-label-controls"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useStudioScreenViewModel } from "@/features/studio/use-studio-screen-viewmodel"
import { useLabelHotkeys } from "@/hooks/use-label-hotkeys"
import { getLabelingConfig } from "@/lib/labeling-config"
import type { Annotation, ImageData, Label, Prediction } from "@/types/core"
import type { PipelinePrompt } from "@/ipc/studio"
import { toast } from "sonner"

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
    activeLabel,
    onCreateAnnotationDraft,
    onUpdateAnnotation,
    onDeleteAnnotation,
    onUndo,
    onRedo,
    onSmartSegment,
  }: {
    image: ImageData
    annotations: Annotation[]
    predictions: Prediction[]
    labels: Label[]
    activeLabel: Label | null
    onCreateAnnotationDraft: (draft: {
      name: string
      color: string
      type: string
      coordinates: Array<{ x: number; y: number }>
      labelId?: string
    }) => Promise<void>
    onUpdateAnnotation: (
      annotationId: string,
      updates: Partial<Annotation>
    ) => Promise<void>
    onDeleteAnnotation: (annotationId: string) => Promise<void>
    onUndo: () => Promise<void> | void
    onRedo: () => Promise<void> | void
    onSmartSegment: (prompt: PipelinePrompt) => void | Promise<void>
  }) => (
    <Canvas
      image={image}
      annotations={annotations}
      predictions={predictions}
      labels={labels}
      activeLabel={activeLabel}
      onCreateAnnotationDraft={onCreateAnnotationDraft}
      onUpdateAnnotation={onUpdateAnnotation}
      onDeleteAnnotation={onDeleteAnnotation}
      onUndo={onUndo}
      onRedo={onRedo}
      onSmartSegment={onSmartSegment}
    />
  )
)

MemoizedCanvas.displayName = "MemoizedCanvas"

const EmptyImageState = memo(() => (
  <div className="flex h-full items-center justify-center bg-muted">
    <p className="text-muted-foreground">No images in this project</p>
  </div>
))

EmptyImageState.displayName = "EmptyImageState"

export const ImageLabeler = memo(({ projectId, imageId }: ImageLabelerProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)
  const viewModel = useStudioScreenViewModel(projectId, imageId)

  // Smart Segment (SAM): the tool handler voids the promise, so surface the
  // outcome here — otherwise a failed/empty run silently does nothing and looks
  // broken. Success drops a polygon into the prediction review loop.
  const handleSmartSegment = useCallback(
    async (prompt: PipelinePrompt) => {
      const outcome = await viewModel.smartSegment(prompt)
      if (outcome.status === "ok") {
        if (outcome.count > 0) {
          toast.success(
            `Segmented ${outcome.count} object${outcome.count === 1 ? "" : "s"} — review it on the canvas.`
          )
        } else {
          toast.info(
            "SAM didn't return a shape there. Click the center of the object, or drag a box around it."
          )
        }
      } else if (outcome.status === "no-model") {
        toast.error(
          "No SAM model installed. Install “Segment Anything (SAM)” on the AI Models page first."
        )
      } else {
        toast.error(`Smart Segment failed: ${outcome.message}`)
      }
    },
    [viewModel.smartSegment]
  )

  // Auto-label: run the picked detection model on the current image. Surfaces
  // the result so the toolbar button has clear feedback; suggestions land in the
  // review panel where each label can be edited before accepting.
  const handleAutoLabel = useCallback(
    async (modelId: string) => {
      try {
        const created = await viewModel.generatePredictions(modelId)
        if (created.length > 0) {
          toast.success(
            `Auto-label found ${created.length} object${created.length === 1 ? "" : "s"} — review them on the right.`
          )
        } else {
          toast.info(
            "No objects found above the confidence threshold. Try another image or model."
          )
        }
      } catch (error) {
        toast.error(
          `Auto-label failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [viewModel.generatePredictions]
  )

  // The project's template decides which tools show and whether we're in
  // region-drawing or whole-image classification mode.
  const config = useMemo(
    () => getLabelingConfig(viewModel.project?.type),
    [viewModel.project?.type]
  )

  const classificationAnnotation = useMemo(
    () =>
      viewModel.data.annotations.find(
        (annotation) => annotation.type === "classification"
      ),
    [viewModel.data.annotations]
  )

  const assignImageClass = useCallback(
    async (label: Label) => {
      // Single-label classification: replace any existing image class.
      const existing = viewModel.data.annotations.filter(
        (annotation) => annotation.type === "classification"
      )
      await Promise.all(
        existing.map((annotation) => viewModel.deleteAnnotation(annotation.id))
      )
      await viewModel.createAnnotationFromDraft({
        name: label.name,
        color: label.color,
        type: "classification",
        coordinates: [],
      })
    },
    [viewModel]
  )

  const clearImageClass = useCallback(async () => {
    const existing = viewModel.data.annotations.filter(
      (annotation) => annotation.type === "classification"
    )
    await Promise.all(
      existing.map((annotation) => viewModel.deleteAnnotation(annotation.id))
    )
  }, [viewModel])

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

  // Clicking a class arms it as the active class (so new shapes inherit it) and,
  // if a shape is currently selected, re-labels that shape — covering both the
  // "set up for fast labeling" and "fix this one" flows from a single click.
  const handleLabelSelect = useCallback(
    (label: Label) => {
      viewModel.setActiveLabelId(label.id)

      if (viewModel.selectedAnnotation) {
        void viewModel.updateAnnotation(viewModel.selectedAnnotation.id, {
          name: label.name,
          color: label.color,
          labelId: label.id,
          label_id: label.id,
        })
      }
    },
    [viewModel]
  )

  // Single keyboard listener for the labeler: ←/→ navigate images, 1–9 arm the
  // Nth class, Esc/0 clears it.
  useLabelHotkeys({
    labels: viewModel.data.labels,
    activeLabelId: viewModel.activeLabelId,
    setActiveLabelId: viewModel.setActiveLabelId,
    onNextImage: viewModel.goToNextImage,
    onPreviousImage: viewModel.goToPreviousImage,
    onToggleCrosshair: viewModel.toggleCrosshair,
    onToggleCoordinates: viewModel.toggleCoordinates,
    onToggleRuler: viewModel.toggleRuler,
  })

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-muted text-foreground">
      <StudioHeader
        projectName={viewModel.project?.name || "Project"}
        projectStats={viewModel.projectStats}
        isLoading={viewModel.isProjectSummaryLoading}
        onBack={viewModel.navigateBackToProjects}
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
            allowedTools={config.tools}
            aiSlot={
              <AutoLabelControls
                models={viewModel.data.aiModels}
                isRunning={viewModel.isGeneratingPredictions}
                onAutoLabel={handleAutoLabel}
              />
            }
            selectedTool={viewModel.selectedTool}
            onSelectTool={viewModel.setSelectedTool}
            zoom={viewModel.zoom}
            onZoomIn={viewModel.zoomIn}
            onZoomOut={viewModel.zoomOut}
            onResetView={viewModel.resetView}
            showCrosshair={viewModel.showCrosshair}
            showCoordinates={viewModel.showCoordinates}
            showRuler={viewModel.showRuler}
            onToggleCrosshair={viewModel.toggleCrosshair}
            onToggleCoordinates={viewModel.toggleCoordinates}
            onToggleRuler={viewModel.toggleRuler}
            canUndo={viewModel.canUndo}
            canRedo={viewModel.canRedo}
            onUndo={viewModel.undo}
            onRedo={viewModel.redo}
          />

          <div className="relative flex-1 overflow-hidden">
            {viewModel.data.image ? (
              <MemoizedCanvas
                image={viewModel.data.image}
                annotations={viewModel.data.annotations}
                predictions={viewModel.data.predictions}
                labels={viewModel.data.labels}
                activeLabel={viewModel.activeLabel}
                onCreateAnnotationDraft={viewModel.createAnnotationFromDraft}
                onUpdateAnnotation={viewModel.updateAnnotation}
                onDeleteAnnotation={viewModel.deleteAnnotation}
                onUndo={viewModel.undo}
                onRedo={viewModel.redo}
                onSmartSegment={handleSmartSegment}
              />
            ) : (
              <EmptyImageState />
            )}

            {viewModel.isSegmenting && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-sm font-medium shadow-lg backdrop-blur">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Segmenting…</span>
              </div>
            )}

            <PredictionReviewPanel
              predictions={viewModel.data.predictions}
              labels={viewModel.data.labels}
              onAccept={viewModel.acceptPrediction}
              onReject={viewModel.rejectPrediction}
              offset={showCopilot}
            />

            {config.allowsClassification && viewModel.data.image ? (
              <ClassificationPanel
                labels={viewModel.data.labels}
                active={classificationAnnotation}
                onAssign={(label) => void assignImageClass(label)}
                onClear={() => void clearImageClass()}
              />
            ) : null}

            {viewModel.contextMenu.visible ? (
              <ContextMenu
                x={viewModel.contextMenu.x}
                y={viewModel.contextMenu.y}
                onSelectTool={viewModel.setSelectedTool}
                onResetView={viewModel.resetView}
                containerRect={
                  canvasContainerRef.current?.getBoundingClientRect() || null
                }
                onClose={viewModel.closeContextMenu}
              />
            ) : null}

            {!showCopilot && (
              <Button
                size="sm"
                className="absolute bottom-4 right-4 z-20 gap-1.5 shadow-lg"
                onClick={() => setShowCopilot(true)}
              >
                <Sparkles className="h-4 w-4" />
                AI Copilot
              </Button>
            )}
            {showCopilot && (
              <AiCopilotPanel
                key={viewModel.data.image?.id}
                projectId={viewModel.effectiveProjectId}
                imageId={viewModel.data.image?.id}
                imageName={viewModel.data.image?.name}
                onClose={() => setShowCopilot(false)}
              />
            )}
          </div>

          <StudioBottomBar
            currentImageIndex={viewModel.currentImageIndex}
            projectStats={viewModel.projectStats}
            hasNext={viewModel.hasNext}
            hasPrevious={viewModel.hasPrevious}
            onNext={viewModel.goToNextImage}
            onPrevious={viewModel.goToPreviousImage}
          />
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
            activeLabelId={viewModel.activeLabelId}
            isLoading={viewModel.data.isLoading}
          />
        </ResizablePanel>
      </div>

      {viewModel.showSettingsModal ? (
        <SettingsModal onClose={viewModel.closeSettingsModal} />
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
    isLoading,
    onBack,
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
    isLoading: boolean
    onBack: () => void
    onOpenSettings: () => void
    onExport: () => void | Promise<void>
    isExporting: boolean
  }) => {
    return (
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">
              {projectName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading project stats…"
                : `${projectStats.labeledImages} of ${projectStats.totalImages} images labeled · ${projectStats.totalLabels} labels`}
            </p>
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

// Bottom action bar (Label Studio style): image navigation + progress sit below
// the canvas, keeping the header free for project-level actions.
const StudioBottomBar = memo(
  ({
    currentImageIndex,
    projectStats,
    hasNext,
    hasPrevious,
    onNext,
    onPrevious,
  }: {
    currentImageIndex: number
    projectStats: {
      totalImages: number
      labeledImages: number
      totalLabels: number
    }
    hasNext: boolean
    hasPrevious: boolean
    onNext: () => void
    onPrevious: () => void
  }) => {
    const progress =
      projectStats.totalImages > 0
        ? Math.round(
            (projectStats.labeledImages / projectStats.totalImages) * 100
          )
        : 0

    return (
      <footer className="flex items-center justify-between border-t border-border bg-card px-4 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
              }
            />
            <TooltipContent side="top">
              Previous image
              <kbd className="ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background">
                Left Arrow
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {currentImageIndex >= 0 && projectStats.totalImages > 0 ? (
            <span className="font-medium text-foreground">
              Image {currentImageIndex + 1} of {projectStats.totalImages}
            </span>
          ) : null}
          <Separator orientation="vertical" className="h-4" />
          <span>
            {projectStats.labeledImages}/{projectStats.totalImages} labeled ·{" "}
            {progress}%
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="sm" onClick={onNext} disabled={!hasNext}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent side="top">
              Next image
              <kbd className="ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background">
                Right Arrow
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </footer>
    )
  }
)

StudioBottomBar.displayName = "StudioBottomBar"
