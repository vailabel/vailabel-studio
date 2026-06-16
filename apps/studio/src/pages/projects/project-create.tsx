import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, Clock, Film, FileText, ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { ImageGrid } from "@/components/ui/image-upload"
import { LabelingInterfaceEditor } from "@/components/projects/labeling-interface-editor"
import { TemplateIllustration } from "@/components/projects/template-illustrations"
import { FileDropZone } from "@/components/projects/file-drop-zone"
import { useFileDrop } from "@/hooks/use-file-drop"
import { useProjectCreateViewModel } from "@/viewmodels/project-create-viewmodel"
import {
  LABELING_TEMPLATES,
  TEMPLATE_CATEGORY_ORDER,
  DATA_KIND_LABELS,
  type DataKind,
  type LabelingTemplate,
} from "@/lib/labeling-templates"
import {
  descriptorForKind,
  type ModalityDescriptor,
} from "@/lib/modality-registry"
import { parseLabelConfig } from "@/lib/label-config/parse"
import { configStringForTemplate } from "@/lib/label-config/generate"
import { inferModalityTask } from "@/lib/label-config/infer"
import type { LabelConfig } from "@/lib/label-config/types"
import { cn } from "@/lib/utils"

type ViewModel = ReturnType<typeof useProjectCreateViewModel>

const TABS = ["Project Name", "Data Import", "Labeling Setup"] as const
const CUSTOM_TEMPLATE_ID = "custom"
const MAIN_CATEGORIES = TEMPLATE_CATEGORY_ORDER.filter((c) => c !== "Custom")

interface ConfigInfo {
  ok: boolean
  config: LabelConfig | null
  dataKind: DataKind
  error: string | null
}

export const ProjectCreate = memo(() => {
  const viewModel = useProjectCreateViewModel()

  const [tab, setTab] = useState(0)
  const [templateId, setTemplateId] = useState("object-detection")
  const [category, setCategory] = useState("Computer Vision")

  const selectedTemplate = useMemo(
    () => LABELING_TEMPLATES.find((t) => t.id === templateId),
    [templateId]
  )
  const customTemplate = useMemo(
    () => LABELING_TEMPLATES.find((t) => t.id === CUSTOM_TEMPLATE_ID),
    []
  )

  // The labeling config is the single source of truth for validity, the data
  // kind to import, and the visual editor + preview.
  const configInfo = useMemo<ConfigInfo>(() => {
    try {
      const parsed = parseLabelConfig(viewModel.labelConfig)
      // The primary object tag is itself a data kind (image/text/audio/video).
      const primary = parsed.objects.find((object) =>
        ["image", "text", "audio", "video"].includes(object.tag)
      )
      const dataKind = (primary?.tag as DataKind) ?? "image"
      const ok = parsed.objects.length > 0 && parsed.controls.length > 0
      return {
        ok,
        config: parsed,
        dataKind,
        error: ok ? null : "Add a data object and at least one control.",
      }
    } catch (error) {
      return {
        ok: false,
        config: null,
        dataKind: "image",
        error: error instanceof Error ? error.message : "Invalid config",
      }
    }
  }, [viewModel.labelConfig])

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

  const tabValid = [
    viewModel.name.trim().length > 0,
    // `hasItems` is false when the kind has no descriptor, so this also gates
    // out unsupported (roadmap) templates.
    hasItems,
    selectedTemplate?.status === "available" && configInfo.ok,
  ]
  const canSave = tabValid.every(Boolean)

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar: title · tabs · cancel/save */}
      <header className="flex items-center gap-4 border-b border-border px-6 py-3">
        <h1 className="text-xl font-bold">Create Project</h1>
        <div className="flex flex-1 justify-center">
          <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
            {TABS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(index)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  index === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
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
            className="gap-2"
          >
            {viewModel.isCreating && <Spinner />}
            Save
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 0 && (
          <div className="h-full overflow-y-auto p-6">
            <ProjectStep viewModel={viewModel} />
          </div>
        )}

        {tab === 1 && (
          <div className="h-full overflow-y-auto p-6">
            <DataStep
              viewModel={viewModel}
              selectedTemplate={selectedTemplate}
              descriptor={descriptor}
            />
          </div>
        )}

        {tab === 2 && (
          <LabelingStep
            category={category}
            onSelectCategory={setCategory}
            templateId={templateId}
            selectedTemplate={selectedTemplate}
            customTemplate={customTemplate}
            configInfo={configInfo}
            viewModel={viewModel}
            onSelectTemplate={selectTemplate}
          />
        )}
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
    </div>
  )
})

ProjectCreate.displayName = "ProjectCreate"

// ── Tab: Project Name ────────────────────────────────────────────────────────
const ProjectStep = memo(({ viewModel }: { viewModel: ViewModel }) => (
  <div className="mx-auto flex max-w-xl flex-col gap-4">
    <div className="space-y-2">
      <Label htmlFor="project-name">Project name</Label>
      <Input
        id="project-name"
        value={viewModel.name}
        onChange={(event) => viewModel.setName(event.target.value)}
        placeholder="My dataset"
        autoFocus
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="project-description">
        Description <span className="text-muted-foreground">(optional)</span>
      </Label>
      <Textarea
        id="project-description"
        value={viewModel.description}
        onChange={(event) => viewModel.setDescription(event.target.value)}
        placeholder="What is this dataset about?"
        rows={3}
      />
    </div>
  </div>
))

ProjectStep.displayName = "ProjectStep"

// ── Tab: Labeling Setup (category sidebar + template grid + interface) ────────
const LabelingStep = memo(
  ({
    category,
    onSelectCategory,
    templateId,
    selectedTemplate,
    customTemplate,
    configInfo,
    viewModel,
    onSelectTemplate,
  }: {
    category: string
    onSelectCategory: (category: string) => void
    templateId: string
    selectedTemplate?: LabelingTemplate
    customTemplate?: LabelingTemplate
    configInfo: ConfigInfo
    viewModel: ViewModel
    onSelectTemplate: (template: LabelingTemplate) => void
  }) => {
    const templates = useMemo(
      () => LABELING_TEMPLATES.filter((t) => t.category === category),
      [category]
    )
    return (
      <div className="flex h-full">
        {/* Category sidebar */}
        <nav className="w-56 shrink-0 overflow-y-auto border-r border-border py-2">
          {MAIN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors",
                cat === category
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="truncate">{cat}</span>
              <ChevronRight className="size-4 shrink-0 opacity-60" />
            </button>
          ))}
          {customTemplate && (
            <button
              type="button"
              onClick={() => {
                onSelectCategory("Custom")
                onSelectTemplate(customTemplate)
              }}
              className={cn(
                "mt-1 w-full border-t border-border px-4 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-muted/50",
                category === "Custom" && "bg-muted"
              )}
            >
              Custom template
            </button>
          )}
        </nav>

        {/* Template grid + interface editor */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={template.id === templateId}
                onSelect={onSelectTemplate}
              />
            ))}
          </div>

          {selectedTemplate && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-3 text-sm font-semibold">
                {selectedTemplate.label}{" "}
                <span className="font-normal text-muted-foreground">
                  · configure the interface
                </span>
              </p>
              <LabelingInterfaceEditor
                value={viewModel.labelConfig}
                onChange={viewModel.setLabelConfig}
                config={configInfo.config}
                error={configInfo.error}
              />
            </div>
          )}
        </div>
      </div>
    )
  }
)

LabelingStep.displayName = "LabelingStep"

// A template card with an icon "thumbnail" header (Label Studio gallery style).
const TemplateCard = memo(
  ({
    template,
    selected,
    onSelect,
  }: {
    template: LabelingTemplate
    selected: boolean
    onSelect: (template: LabelingTemplate) => void
  }) => {
    const available = template.status === "available"
    return (
      <button
        type="button"
        disabled={!available}
        onClick={() => onSelect(template)}
        className={cn(
          "group flex flex-col overflow-hidden rounded-lg border text-left transition-all",
          selected
            ? "border-primary ring-2 ring-primary"
            : available
              ? "border-border hover:border-primary/50 hover:shadow-sm"
              : "cursor-not-allowed border-dashed border-border opacity-60"
        )}
      >
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {template.image ? (
            <img
              src={template.image}
              alt={template.label}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <TemplateIllustration template={template} className="h-full w-full" />
          )}
        </div>
        <div className="flex items-start gap-1.5 p-3">
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
            {template.label}
          </p>
          {!available && (
            <Badge
              variant="secondary"
              className="gap-1 text-amber-600 dark:text-amber-400"
            >
              <Clock className="size-3" />
              Soon
            </Badge>
          )}
        </div>
      </button>
    )
  }
)

TemplateCard.displayName = "TemplateCard"

// ── Tab: Data Import (drop zone) ─────────────────────────────────────────────
const DataStep = memo(
  ({
    viewModel,
    selectedTemplate,
    descriptor,
  }: {
    viewModel: ViewModel
    selectedTemplate?: LabelingTemplate
    descriptor?: ModalityDescriptor
  }) => {
    const isImage = descriptor?.kind === "image"
    const isFiles = descriptor?.importMode === "files"

    const handleDrop = useCallback(
      (paths: string[]) => {
        if (!descriptor) return
        const picked = paths.filter(descriptor.accepts)
        if (descriptor.kind === "image") void viewModel.addImagePaths(picked)
        else if (descriptor.importMode === "files")
          void viewModel.addDocumentPaths(picked, descriptor.grantScope)
      },
      [viewModel, descriptor]
    )
    const isOver = useFileDrop(handleDrop, isImage || isFiles)

    // Deferred-import kinds (video): clips are imported inside the studio editor.
    if (descriptor?.importMode === "none") {
      return (
        <div className="mx-auto max-w-2xl">
          <Alert>
            <Film className="size-4" />
            <AlertDescription>
              Create the project, then import and process your video clips in the
              studio — it extracts frames, detects scene cuts, and tracks objects
              across time.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    // Unsupported kind: a roadmap template with no registered descriptor.
    if (!descriptor) {
      return (
        <div className="mx-auto max-w-2xl">
          <Alert>
            <Clock className="size-4" />
            <AlertDescription>
              {selectedTemplate
                ? `${DATA_KIND_LABELS[selectedTemplate.dataKind]} import isn't available yet — this template is on the roadmap.`
                : "Pick a template first."}
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Importing{" "}
          <span className="font-medium text-foreground">{descriptor.label}</span>{" "}
          — files are referenced in place, never copied.
        </p>

        <FileDropZone
          isOver={isOver}
          busy={viewModel.isScanning}
          onBrowse={() => void viewModel.openImport(descriptor)}
        />

        {isImage && viewModel.folderPath && (
          <p className="truncate text-xs text-muted-foreground">
            {viewModel.folderPath}
          </p>
        )}

        {isImage && viewModel.images.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-5 text-primary" />
              <span className="font-semibold">Selected images</span>
              <Badge variant="secondary">
                {viewModel.images.length} file
                {viewModel.images.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <ImageGrid images={viewModel.images} onRemove={viewModel.removeImage} />
          </div>
        )}

        {isFiles && viewModel.documents.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <span className="font-semibold">
                {descriptor.kind === "audio"
                  ? "Selected clips"
                  : "Selected documents"}
              </span>
              <Badge variant="secondary">
                {viewModel.documents.length} file
                {viewModel.documents.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {viewModel.documents.map((doc, index) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate" title={doc.path}>
                    {doc.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => viewModel.removeDocument(index)}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${doc.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
)

DataStep.displayName = "DataStep"
