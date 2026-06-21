import { memo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import type { Annotation, Label, Prediction } from "@/shared/types/core"
import { LabelListPanel } from "@/features/studio/components/label-list-panel"
import { RegionsPanel } from "@/features/studio/components/right-panel/regions-panel"
import { AiCopilotPanel } from "@/features/studio/components/ai/ai-copilot-panel"
import { usePersistentTab } from "@/features/studio/hooks/use-persistent-tab"

interface StudioRightPanelProps {
  /** Canvas (image) editor → show the Regions tab; AI work now lives in the
   *  Copilot (the agent proposes, you approve). Other modalities get a compact
   *  Classes + Copilot stack. */
  isImageEditor: boolean
  /** Project data modality + task — passed to the Copilot so it offers the right
   *  tools and the backend handles the turn correctly. */
  modality?: string
  task?: string
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
  // Copilot review: live predictions on the canvas + batch approve/reject. The
  // agent generates them (detect/segment); per-box ✓/✗ stays on the canvas.
  predictions: Prediction[]
  onAcceptAllPredictions?: () => Promise<number>
  onRejectAllPredictions?: () => Promise<number>
  // Copilot
  projectId?: string
  itemId?: string
  itemName?: string
}

// The Label-Studio-style right column: a class palette plus the on-device
// Copilot, docked here instead of floating over the editor. Image (canvas)
// projects also get a Regions tab. All AI work — running the detector,
// suggesting labels, QA — happens in the Copilot: it's an agent that proposes,
// and the user approves (per-box ✓/✗ on the canvas, or Accept/Reject all in the
// Copilot). The active tab is remembered across item navigation.
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

  // Non-canvas modalities (text/audio/tabular/custom) get a compact Classes +
  // Copilot stack — their region/segment lists live inline in the editor body.
  if (!props.isImageEditor) {
    return <GenericRightPanel classes={classes} {...props} />
  }

  return <ImageRightPanel classes={classes} {...props} />
})

StudioRightPanel.displayName = "StudioRightPanel"

// A small count pill shown on a tab trigger (e.g. predictions waiting to review).
function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
      {children}
    </span>
  )
}

const GENERIC_TABS = ["classes", "copilot"] as const

const GenericRightPanel = memo(
  ({
    classes,
    projectId,
    itemId,
    itemName,
    modality,
    task,
  }: StudioRightPanelProps & { classes: React.ReactNode }) => {
    const [tab, setTab] = usePersistentTab(
      "studio.rightTab.generic",
      GENERIC_TABS,
      "classes"
    )

    return (
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex h-full min-h-0 flex-col gap-0 bg-card"
      >
        <TabsList variant="line" className="mx-2 mt-2 w-auto justify-start">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="copilot">Copilot</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="min-h-0 overflow-hidden">
          {classes}
        </TabsContent>

        <TabsContent
          value="copilot"
          keepMounted
          className="min-h-0 overflow-hidden"
        >
          <AiCopilotPanel
            key={itemId}
            projectId={projectId}
            itemId={itemId}
            itemName={itemName}
            modality={modality}
            task={task}
          />
        </TabsContent>
      </Tabs>
    )
  }
)

GenericRightPanel.displayName = "GenericRightPanel"

const IMAGE_TABS = ["classes", "regions", "copilot"] as const

const ImageRightPanel = memo(
  ({
    classes,
    annotations,
    labels,
    selectedAnnotationId,
    onSelectAnnotation,
    onDeleteAnnotation,
    predictions,
    onAcceptAllPredictions,
    onRejectAllPredictions,
    projectId,
    itemId,
    itemName,
    modality,
    task,
  }: StudioRightPanelProps & { classes: React.ReactNode }) => {
    const [tab, setTab] = usePersistentTab(
      "studio.rightTab.image",
      IMAGE_TABS,
      "classes"
    )

    return (
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex h-full min-h-0 flex-col gap-0 bg-card"
      >
        <TabsList variant="line" className="mx-2 mt-2 w-auto justify-start">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="copilot">
            Copilot
            {predictions.length > 0 ? (
              <TabCount>{predictions.length}</TabCount>
            ) : null}
          </TabsTrigger>
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

        {/* Copilot: the single AI surface. The agent runs the detector / suggests
            labels / QAs; predictions land on the canvas and the user approves them
            here (Accept/Reject all) or per-box on the canvas (✓/✗ pills). */}
        <TabsContent
          value="copilot"
          keepMounted
          className="min-h-0 overflow-hidden"
        >
          <AiCopilotPanel
            key={itemId}
            projectId={projectId}
            itemId={itemId}
            itemName={itemName}
            modality={modality}
            task={task}
            predictions={predictions}
            onAcceptAllPredictions={onAcceptAllPredictions}
            onRejectAllPredictions={onRejectAllPredictions}
          />
        </TabsContent>
      </Tabs>
    )
  }
)

ImageRightPanel.displayName = "ImageRightPanel"
