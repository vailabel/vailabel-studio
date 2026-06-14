import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Brain,
  Cpu,
  HardDrive,
  Import,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AIModelForm from "@/components/forms/AIModelForm"
import { AiRuntimeStatus } from "@/components/ai/ai-runtime-status"
import {
  useAIModelViewModel,
  type CatalogSystemModel,
  type CatalogSystemModelVariant,
} from "@/viewmodels/ai-model-viewmodel"
import {
  getAIModelMetadata,
  getModelClassCount,
  getModelUsageHint,
  getPredictionReadinessLabel,
  getModelUnsupportedReason,
  isDetectionModel,
  isModelPredictionReady,
  isModelUsable,
  willModelConvertOnRun,
} from "@/lib/ai-model-metadata"
import { aiModelFormSchema, type AIModelFormData } from "@/lib/schemas/ai-model"
import { toast } from "sonner"
import type { AIModel } from "@/types/core"

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const DEFAULT_FORM: AIModelFormData = {
  name: "",
  description: "",
  version: "1.0.0",
  category: "detection",
  modelFilePath: "",
  configFilePath: "",
}

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Brain
  label: string
  value: React.ReactNode
}) => (
  <Card size="sm">
    <CardContent className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
)

export default function AIModelListPage() {
  const viewModel = useAIModelViewModel()
  const {
    availableModels = [],
    systemModels = [],
    isLoading,
    isImportingModel,
    recommendedInstalledModel,
    recommendedSystemModel,
    selectedModel,
    totalModelSize,
    findInstalledCatalogVariant,
    isInstallingVariant,
    deleteModel,
    activateModel,
    importModel,
    installSystemModel,
    selectCatalogRelease,
    refreshCatalogReleases,
    refreshModels,
  } = viewModel

  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AIModel | null>(null)

  const form = useForm<AIModelFormData>({
    resolver: zodResolver(aiModelFormSchema),
    defaultValues: DEFAULT_FORM,
  })

  const predictionReadyCount = availableModels.filter((model) =>
    isModelPredictionReady(model)
  ).length

  const installToast = (model: AIModel, verb: string) =>
    toast(`Model ${verb}`, {
      description: isModelPredictionReady(model)
        ? `${model.name} is ready for offline prediction generation.`
        : willModelConvertOnRun(model)
          ? `${model.name} will convert to ONNX automatically the first time AI detect runs.`
          : getModelUnsupportedReason(model) ||
            `${model.name} was ${verb}, but it is not prediction-ready yet.`,
    })

  const onSubmit = async (data: AIModelFormData) => {
    try {
      const imported = await importModel({
        name: data.name,
        description: data.description,
        version: data.version,
        category: data.category,
        modelFilePath: data.modelFilePath,
        configFilePath: data.configFilePath || undefined,
      })
      await activateModel(imported.id)
      await refreshModels()
      installToast(imported, "imported")
      setShowImportModal(false)
      form.reset(DEFAULT_FORM)
    } catch (error) {
      toast.error("Import failed", {
        description:
          error instanceof Error ? error.message : "The model could not be imported.",
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteModel(target.id)
      toast("Model removed", { description: `${target.name} was removed.` })
    } catch {
      toast.error("Delete failed", { description: "The model could not be removed." })
    }
  }

  const handleActivate = async (modelId: string) => {
    try {
      await activateModel(modelId)
      toast("Model activated", {
        description: "This model is now the default local detector.",
      })
    } catch {
      toast.error("Activation failed", {
        description: "The model could not be activated.",
      })
    }
  }

  const handleInstallVariant = async (
    model: CatalogSystemModel,
    variant: CatalogSystemModelVariant
  ) => {
    try {
      const installed = await installSystemModel(model, variant)
      await activateModel(installed.id)
      await refreshModels()
      installToast(installed, "installed")
    } catch (error) {
      toast.error("Install failed", {
        description:
          error instanceof Error
            ? error.message
            : "The model could not be installed from the catalog.",
      })
    }
  }

  const handleRefreshReleases = async (model: CatalogSystemModel) => {
    try {
      await refreshCatalogReleases(model)
    } catch (error) {
      toast.error("Release refresh failed", {
        description:
          error instanceof Error
            ? error.message
            : "The GitHub release list could not be refreshed.",
      })
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Install and manage local models for offline pre-annotations.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowImportModal(true)} className="gap-1.5">
          <Import className="size-4" />
          Import local model
        </Button>
      </div>

      <AiRuntimeStatus />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Brain} label="Installed" value={availableModels.length} />
        <StatCard
          icon={HardDrive}
          label="Storage"
          value={formatFileSize(totalModelSize)}
        />
        <StatCard
          icon={Sparkles}
          label="Prediction-ready"
          value={predictionReadyCount}
        />
        <StatCard
          icon={Cpu}
          label="Active model"
          value={selectedModel?.name || "None"}
        />
      </div>

      <Alert>
        <Cpu className="size-4" />
        <AlertDescription>
          Install a curated model from the catalog, pick a GitHub release for YOLO
          families, or import a local file. Prediction generation always stays
          local and offline.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="installed" className="gap-4">
        <TabsList>
          <TabsTrigger value="installed">Installed models</TabsTrigger>
          <TabsTrigger value="catalog">Reference catalog</TabsTrigger>
        </TabsList>

        {/* Installed */}
        <TabsContent value="installed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your local models</CardTitle>
              <CardDescription>
                Models available for offline prediction generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Spinner /> Loading models…
                </div>
              ) : availableModels.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Brain className="size-9 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No local models yet — import one or install from the catalog.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Prediction</TableHead>
                      <TableHead>Backend</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableModels.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.isActive ? (
                              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                Active
                              </Badge>
                            ) : recommendedInstalledModel?.id === model.id ? (
                              <Badge variant="secondary">Default</Badge>
                            ) : null}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {model.modelVersion ||
                              model.model_version ||
                              `v${model.version}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.category || "uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatFileSize(model.modelSize || 0)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {getModelClassCount(model) || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isModelUsable(model) ? "secondary" : "outline"
                            }
                            title={getModelUsageHint(model)}
                          >
                            {getPredictionReadinessLabel(model)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(model.backend || "cpu").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {/* "Active" applies to the detector only. Segmentation
                                models (SAM) are used on demand by the copilot, so
                                they're never "activated". */}
                            {!model.isActive && isDetectionModel(model) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleActivate(model.id)}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(model)}
                              aria-label={`Delete ${model.name}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog */}
        <TabsContent value="catalog">
          <div className="grid gap-4 lg:grid-cols-2">
            {systemModels.map((model) => (
              <Card
                key={model.id}
                className={
                  recommendedSystemModel?.id === model.id
                    ? "ring-1 ring-primary"
                    : undefined
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {model.name}
                    {recommendedSystemModel?.id === model.id && (
                      <Badge>Recommended</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{model.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm">
                  {model.releaseSource && (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {model.releaseSource.owner}/{model.releaseSource.repo}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => void handleRefreshReleases(model)}
                          disabled={model.isReleaseLoading}
                        >
                          {model.isReleaseLoading ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Refresh releases
                        </Button>
                      </div>
                      {model.releaseOptions?.length ? (
                        <Select
                          value={model.selectedReleaseTag || undefined}
                          onValueChange={(value) => {
                            if (value) selectCatalogRelease(model, value)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a release" />
                          </SelectTrigger>
                          <SelectContent>
                            {model.releaseOptions.map((release) => (
                              <SelectItem
                                key={release.tagName}
                                value={release.tagName}
                              >
                                {release.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Using built-in download URLs — refresh to pull the latest
                          GitHub releases.
                        </p>
                      )}
                      {model.releaseError && (
                        <p className="text-xs text-destructive">
                          {model.releaseError}
                        </p>
                      )}
                    </div>
                  )}

                  {model.variants?.length ? (
                    <div className="flex flex-col gap-2">
                      {model.variants.map((variant) => {
                        const installed = findInstalledCatalogVariant(
                          model,
                          variant
                        )
                        const installing = isInstallingVariant(model, variant)
                        const meta = getAIModelMetadata({
                          modelMetadata: variant.modelMetadata,
                        })
                        return (
                          <div
                            key={`${model.id}:${variant.assetName || variant.name}`}
                            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-medium text-foreground">
                                  {variant.modelVersion || variant.name}
                                </span>
                                {variant.recommended && <Badge>Recommended</Badge>}
                                {installed && (
                                  <Badge variant="secondary">Installed</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {typeof variant.size === "number" && (
                                  <span>{formatFileSize(variant.size)}</span>
                                )}
                                {typeof variant.accuracy === "number" && (
                                  <span>{variant.accuracy}% mAP</span>
                                )}
                                <span>
                                  {meta.supportsPrediction
                                    ? "Prediction ready"
                                    : "Reference only"}
                                </span>
                              </div>
                              {!variant.available && variant.unavailableReason && (
                                <p className="text-xs text-destructive">
                                  {variant.unavailableReason}
                                </p>
                              )}
                            </div>

                            {installed ? (
                              installed.isActive ? (
                                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                  Active
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleActivate(installed.id)}
                                >
                                  Activate
                                </Button>
                              )
                            ) : (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() =>
                                  void handleInstallVariant(model, variant)
                                }
                                disabled={installing || !variant.available}
                              >
                                {installing && <Spinner className="size-3.5" />}
                                {installing
                                  ? "Installing…"
                                  : variant.available
                                    ? "Install"
                                    : "Unavailable"}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No installable variants for this family.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Import dialog */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import local model</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <AIModelForm control={form.control} errors={form.formState.errors} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isImportingModel} className="gap-1.5">
                {isImportingModel && <Spinner />}
                {isImportingModel ? "Importing…" : "Import model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove model?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            from your local models? This removes the entry only — the file on disk
            is left in place.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
