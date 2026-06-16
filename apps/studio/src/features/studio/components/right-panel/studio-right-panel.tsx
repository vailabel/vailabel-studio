import { memo, useState, type ComponentProps } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import type { Annotation, Label } from "@/shared/types/core"
import { LabelListPanel } from "@/features/studio/components/label-list-panel"
import { RegionsPanel } from "@/features/studio/components/right-panel/regions-panel"
import { AutoLabelControls } from "@/features/studio/components/ai/auto-label-controls"
import { PredictionReviewPanel } from "@/features/studio/components/ai/prediction-review-panel"
import { AiCopilotPanel } from "@/features/studio/components/ai/ai-copilot-panel"

interface StudioRightPanelProps {
  /** Canvas (image) editor → show the Regions / AI / Copilot tabs. Other
   *  modalities only get the Classes palette. */
  isImageEditor: boolean
  // Classes
  labels: Label[]
  activeLabelId: string | null
  selectedLabelId: string | null
  hasSelectedShape: boolean
  isLoading: boolean
  onLabelSelect: (label: Label) => void
  onLabelAssign: (label: Label) => void
  // Regions
  annotations: Annotation[]
  selectedAnnotationId: string | null
  onSelectAnnotation: (annotation: Annotation) => void
  onDeleteAnnotation: (annotationId: string) => void
  // AI (auto-label + prediction review)
  aiModels: ComponentProps<typeof AutoLabelControls>["models"]
  isGeneratingPredictions: boolean
  onAutoLabel: ComponentProps<typeof AutoLabelControls>["onAutoLabel"]
  predictions: ComponentProps<typeof PredictionReviewPanel>["predictions"]
  onAcceptPrediction: ComponentProps<typeof PredictionReviewPanel>["onAccept"]
  onRejectPrediction: ComponentProps<typeof PredictionReviewPanel>["onReject"]
  // Copilot
  projectId?: string
  imageId?: string
  imageName?: string
}

// The Label-Studio-style right column: a class palette plus (for image labeling)
// a tabbed stack of Regions, the AI auto-label / prediction-review surface, and
// the on-device Copilot — all docked here instead of floating over the canvas.
export const StudioRightPanel = memo((props: StudioRightPanelProps) => {
  const classes = (
    <LabelListPanel
      onLabelSelect={props.onLabelSelect}
      onLabelAssign={props.onLabelAssign}
      selectedLabelId={props.selectedLabelId}
      hasSelectedShape={props.hasSelectedShape}
      labels={props.labels}
      activeLabelId={props.activeLabelId}
      isLoading={props.isLoading}
    />
  )

  // Non-canvas modalities (text/audio) only need the class palette.
  if (!props.isImageEditor) {
    return <div className="h-full bg-card">{classes}</div>
  }

  return <ImageRightPanel classes={classes} {...props} />
})

StudioRightPanel.displayName = "StudioRightPanel"

const ImageRightPanel = memo(
  ({
    classes,
    annotations,
    labels,
    selectedAnnotationId,
    onSelectAnnotation,
    onDeleteAnnotation,
    aiModels,
    isGeneratingPredictions,
    onAutoLabel,
    predictions,
    onAcceptPrediction,
    onRejectPrediction,
    projectId,
    imageId,
    imageName,
  }: StudioRightPanelProps & { classes: React.ReactNode }) => {
    const [tab, setTab] = useState("classes")

    return (
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex h-full min-h-0 flex-col gap-0 bg-card"
      >
        <TabsList variant="line" className="mx-2 mt-2 w-auto justify-start">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="copilot">Copilot</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="min-h-0 overflow-hidden">
          {classes}
        </TabsContent>

        <TabsContent value="regions" className="min-h-0 overflow-hidden">
          <RegionsPanel
            annotations={annotations}
            labels={labels}
            selectedId={selectedAnnotationId}
            onSelect={onSelectAnnotation}
            onDelete={onDeleteAnnotation}
          />
        </TabsContent>

        <TabsContent
          value="ai"
          className="min-h-0 space-y-3 overflow-y-auto p-3"
        >
          <AutoLabelControls
            models={aiModels}
            isRunning={isGeneratingPredictions}
            onAutoLabel={onAutoLabel}
          />
          <PredictionReviewPanel
            predictions={predictions}
            labels={labels}
            onAccept={onAcceptPrediction}
            onReject={onRejectPrediction}
          />
        </TabsContent>

        <TabsContent
          value="copilot"
          keepMounted
          className="min-h-0 overflow-hidden"
        >
          <AiCopilotPanel
            key={imageId}
            projectId={projectId}
            imageId={imageId}
            imageName={imageName}
          />
        </TabsContent>
      </Tabs>
    )
  }
)

ImageRightPanel.displayName = "ImageRightPanel"
