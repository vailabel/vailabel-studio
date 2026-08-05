import { memo, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { ProjectStep } from "@/features/projects/components/create/project-step"
import { LabelingStep } from "@/features/projects/components/create/labeling-step"
import { DataStep } from "@/features/projects/components/create/data-step"
import { useProjectCreateViewModel } from "@/features/projects/model/project-create-viewmodel"
import { deriveConfigInfo } from "@/features/projects/model/config-info"
import {
  LABELING_TEMPLATES,
  TEMPLATE_CATEGORY_ORDER,
  type DataKind,
  type LabelingTemplate,
} from "@/shared/lib/label-config/labeling-templates"
import { descriptorForKind } from "@/features/projects/model/modality-registry"
import { configStringForTemplate } from "@/shared/lib/label-config/generate"
import { inferModalityTask } from "@/shared/lib/label-config/infer"

// Template-first flow: name the project, choose what you're labeling (which
// fixes the data kind), then import data matching that template.
const STEPS = [
  { value: "name", label: "Project Name" },
  { value: "labeling", label: "Labeling Setup" },
  { value: "data", label: "Data Import" },
] as const

const CUSTOM_TEMPLATE_ID = "custom"
const MAIN_CATEGORIES = TEMPLATE_CATEGORY_ORDER.filter(
  (category) => category !== "Custom"
)

export const ProjectCreate = memo(() => {
  const viewModel = useProjectCreateViewModel()

  const [step, setStep] = useState<string>(STEPS[0].value)
  const [templateId, setTemplateId] = useState("object-detection")
  const [category, setCategory] = useState("Computer Vision")

  const selectedTemplate = useMemo(
    () => LABELING_TEMPLATES.find((template) => template.id === templateId),
    [templateId]
  )
  const customTemplate = useMemo(
    () => LABELING_TEMPLATES.find((template) => template.id === CUSTOM_TEMPLATE_ID),
    []
  )

  const configInfo = useMemo(
    () => deriveConfigInfo(viewModel.labelConfig),
    [viewModel.labelConfig]
  )

  // Selecting a template just loads its config; the config then drives
  // everything (modality, task, classes, data kind) — see the effect below.
  const applyTemplate = (template: LabelingTemplate) => {
    if (template.projectType) viewModel.setType(template.projectType)
    viewModel.setLabelConfig(configStringForTemplate(template))
  }

  // The labeling config is the single source of truth: derive the project's
  // modality + task from it, so editing the config (Visual/Code) re-routes the
  // project to the right editor automatically.
  useEffect(() => {
    if (!configInfo.config) return
    const inferred = inferModalityTask(configInfo.config)
    viewModel.setModality(inferred.modality)
    if (inferred.task) viewModel.setTask(inferred.task)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewModel.labelConfig])

  // Seed the default template's config on first mount.
  useEffect(() => {
    if (!viewModel.labelConfig.trim() && selectedTemplate)
      applyTemplate(selectedTemplate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectTemplate = (template: LabelingTemplate) => {
    if (template.status !== "available" || template.id === templateId) return
    setTemplateId(template.id)
    applyTemplate(template)
  }

  // The labeling config (or the selected template) yields a data kind; the
  // modality registry turns that into one descriptor that drives import + Save.
  // An unsupported kind (roadmap template) has no descriptor.
  const effectiveDataKind: DataKind = configInfo.config
    ? configInfo.dataKind
    : (selectedTemplate?.dataKind ?? "image")
  const descriptor = descriptorForKind(effectiveDataKind)
  const hasItems = descriptor
    ? descriptor.hasItems({
        images: viewModel.images.length,
        documents: viewModel.documents.length,
      })
    : false

  // When the data kind changes (e.g. image template → text template), drop stale
  // imports so the project can't be created with mismatched items.
  useEffect(() => {
    viewModel.clearData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDataKind])

  // One entry per step, in order (name · template · data). `hasItems` is false
  // when the kind has no descriptor, so it also gates out roadmap templates.
  const canSave =
    viewModel.name.trim().length > 0 &&
    selectedTemplate?.status === "available" &&
    configInfo.ok &&
    hasItems

  return (
    <Tabs
      value={step}
      onValueChange={setStep}
      className="-m-6 flex h-[calc(100%+3rem)] flex-col gap-0 overflow-hidden bg-background text-foreground"
    >
      <header className="flex items-center gap-4 border-b border-border px-6 py-3">
        <h1 className="text-xl font-bold">Create Project</h1>
        <div className="flex flex-1 justify-center">
          <TabsList>
            {STEPS.map((entry) => (
              <TabsTrigger key={entry.value} value={entry.value}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={viewModel.cancel}
            disabled={viewModel.isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void viewModel.createProject(descriptor)}
            disabled={!canSave || viewModel.isCreating}
          >
            {viewModel.isCreating && <Spinner />}
            Save
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <TabsContent value="name" className="h-full overflow-y-auto p-6">
          <ProjectStep
            name={viewModel.name}
            description={viewModel.description}
            onNameChange={viewModel.setName}
            onDescriptionChange={viewModel.setDescription}
          />
        </TabsContent>

        <TabsContent value="labeling" className="h-full">
          <LabelingStep
            categories={MAIN_CATEGORIES}
            category={category}
            onSelectCategory={setCategory}
            templateId={templateId}
            selectedTemplate={selectedTemplate}
            customTemplate={customTemplate}
            configInfo={configInfo}
            labelConfig={viewModel.labelConfig}
            onLabelConfigChange={viewModel.setLabelConfig}
            onSelectTemplate={selectTemplate}
            onSelectCustom={(template) => {
              setCategory("Custom")
              selectTemplate(template)
            }}
          />
        </TabsContent>

        <TabsContent value="data" className="h-full overflow-y-auto p-6">
          <DataStep
            viewModel={viewModel}
            selectedTemplate={selectedTemplate}
            descriptor={descriptor}
            config={configInfo.config}
          />
        </TabsContent>
      </div>

      {viewModel.error ? (
        <div className="border-t border-border px-6 py-2">
          <Alert variant="destructive">
            <AlertDescription>
              {viewModel.error instanceof Error
                ? viewModel.error.message
                : "Something went wrong while preparing the project."}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </Tabs>
  )
})

ProjectCreate.displayName = "ProjectCreate"
