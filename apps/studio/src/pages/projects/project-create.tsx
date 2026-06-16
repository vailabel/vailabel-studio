import { memo, useMemo, useState } from "react"
import {
  ArrowLeft,
  FolderOpen,
  Info,
  ImageIcon,
  Plus,
  X,
  Clock,
  FileText,
  FilePlus2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { ImageGrid } from "@/components/ui/image-upload"
import { ProjectCreateHeader } from "./components/project-create-header"
import { useProjectCreateViewModel } from "@/viewmodels/project-create-viewmodel"
import {
  LABELING_TEMPLATES,
  templatesGroupedByCategory,
  DATA_KIND_LABELS,
} from "@/lib/labeling-templates"
import { getRandomColor, cn } from "@/lib/utils"

const SectionTitle = ({
  step,
  title,
  hint,
}: {
  step: number
  title: string
  hint?: string
}) => (
  <div className="flex items-center gap-2">
    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {step}
    </span>
    <h3 className="font-semibold">{title}</h3>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </div>
)

export const ProjectCreate = memo(() => {
  const viewModel = useProjectCreateViewModel()
  const hasImages = viewModel.images.length > 0

  const [templateId, setTemplateId] = useState("object-detection")
  const [className, setClassName] = useState("")
  const [classColor, setClassColor] = useState(() => getRandomColor())

  const groups = useMemo(() => templatesGroupedByCategory(), [])
  const selectedTemplate = useMemo(
    () => LABELING_TEMPLATES.find((t) => t.id === templateId),
    [templateId]
  )
  const isImageData = (selectedTemplate?.dataKind ?? "image") === "image"
  const isTextData = selectedTemplate?.dataKind === "text"

  const commitClass = () => {
    if (!className.trim()) return
    viewModel.addClass(className, classColor)
    setClassName("")
    setClassColor(getRandomColor())
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ProjectCreateHeader />

      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
          <CardDescription>
            Name it, choose a labeling template, define your classes, then point
            it at your data — files are referenced in place, never copied.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-8">
          {/* 1 — Project */}
          <section className="flex flex-col gap-3">
            <SectionTitle step={1} title="Project" />
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
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="project-description"
                value={viewModel.description}
                onChange={(event) =>
                  viewModel.setDescription(event.target.value)
                }
                placeholder="What is this dataset about?"
                rows={2}
              />
            </div>
          </section>

          {/* 2 — Template gallery */}
          <section className="flex flex-col gap-3">
            <SectionTitle
              step={2}
              title="Labeling setup"
              hint="choose a template"
            />
            <div className="max-h-[28rem] space-y-5 overflow-y-auto rounded-lg border border-border p-3">
              {groups.map((group) => (
                <div key={group.category} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.category}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.templates.map((template) => {
                      const available = template.status === "available"
                      const selected = available && templateId === template.id
                      return (
                        <button
                          key={template.id}
                          type="button"
                          disabled={!available}
                          onClick={() => {
                            if (!available) return
                            setTemplateId(template.id)
                            if (template.projectType)
                              viewModel.setType(template.projectType)
                            viewModel.setModality(template.modality ?? "image")
                            if (template.task) viewModel.setTask(template.task)
                          }}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : available
                                ? "border-border hover:bg-muted"
                                : "cursor-not-allowed border-dashed border-border opacity-60"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <template.icon className="size-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium">
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
                            <p className="truncate text-xs text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3 — Classes */}
          <section className="flex flex-col gap-3">
            <SectionTitle
              step={3}
              title="Classes"
              hint="optional — also creatable while labeling"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={classColor}
                onChange={(event) => setClassColor(event.target.value)}
                aria-label="Class color"
                className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
              <Input
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    commitClass()
                  }
                }}
                placeholder="Add a class (e.g. person, car) and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                onClick={commitClass}
                disabled={!className.trim()}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>

            {viewModel.classes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewModel.classes.map((cls) => (
                  <span
                    key={cls.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-2 pr-1 text-sm"
                  >
                    <span
                      className="size-3 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: cls.color }}
                    />
                    {cls.name}
                    <button
                      type="button"
                      onClick={() => viewModel.removeClass(cls.id)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${cls.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 4 — Data */}
          <section className="flex flex-col gap-3">
            <SectionTitle
              step={4}
              title="Data"
              hint={
                selectedTemplate
                  ? DATA_KIND_LABELS[selectedTemplate.dataKind]
                  : undefined
              }
            />
            {isImageData ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={viewModel.openImageFolder}
                  disabled={viewModel.isScanning}
                >
                  {viewModel.isScanning ? (
                    <Spinner />
                  ) : (
                    <FolderOpen className="size-5" />
                  )}
                  {viewModel.isScanning
                    ? "Scanning folder…"
                    : hasImages
                      ? "Choose a different folder"
                      : "Open image folder"}
                </Button>

                {viewModel.folderPath && (
                  <p className="truncate text-xs text-muted-foreground">
                    {viewModel.folderPath}
                  </p>
                )}

                {hasImages ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-5 text-primary" />
                      <span className="font-semibold">Selected images</span>
                      <Badge variant="secondary">
                        {viewModel.images.length} file
                        {viewModel.images.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <ImageGrid
                      images={viewModel.images}
                      onRemove={viewModel.removeImage}
                    />
                  </div>
                ) : (
                  <Alert>
                    <Info className="size-4" />
                    <AlertDescription>
                      Existing LabelMe <code>.json</code> sidecars in the folder
                      are imported automatically.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : isTextData ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={viewModel.openTextFiles}
                >
                  <FilePlus2 className="size-5" />
                  {viewModel.documents.length > 0
                    ? "Choose different text files"
                    : "Choose text files (.txt, .md)"}
                </Button>

                {viewModel.documents.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-5 text-primary" />
                      <span className="font-semibold">Selected documents</span>
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
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={doc.path}
                          >
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
                ) : (
                  <Alert>
                    <Info className="size-4" />
                    <AlertDescription>
                      Each file becomes one document to label. Files are
                      referenced in place, never copied.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Alert>
                <Clock className="size-4" />
                <AlertDescription>
                  {DATA_KIND_LABELS[selectedTemplate!.dataKind]} import isn't
                  available yet — this template is on the roadmap.
                </AlertDescription>
              </Alert>
            )}
          </section>

          {viewModel.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {viewModel.error instanceof Error
                  ? viewModel.error.message
                  : "Something went wrong while preparing the project."}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>

        <CardFooter className="justify-between border-t">
          <Button
            variant="outline"
            onClick={viewModel.cancel}
            disabled={viewModel.isCreating}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Cancel
          </Button>

          <Button
            onClick={() => void viewModel.createProject()}
            disabled={
              !viewModel.canCreate ||
              viewModel.isCreating ||
              !(isImageData || isTextData)
            }
            className="gap-2"
          >
            {viewModel.isCreating && <Spinner />}
            {viewModel.isCreating ? "Creating…" : "Create & start labeling"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
})

ProjectCreate.displayName = "ProjectCreate"
