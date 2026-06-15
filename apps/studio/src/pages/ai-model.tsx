import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Brain,
  Cpu,
  HardDrive,
  Import,
  Layers,
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataGrid, type DataGridColumn } from "@/components/data-grid"
import AIModelForm from "@/components/forms/AIModelForm"
import { AiRuntimeStatus } from "@/components/ai/ai-runtime-status"
import { ModelPacks } from "@/components/ai/model-packs"
import { ModelLibrary } from "@/components/ai/model-library"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import {
  getModelClassCount,
  getModelUsageHint,
  getPredictionReadinessLabel,
  getModelUnsupportedReason,
  isModelPredictionReady,
  isModelUsable,
  willModelConvertOnRun,
} from "@/lib/ai-model-metadata"
import {
  countReadyCapabilities,
  totalCapabilities,
} from "@/lib/model-catalog"
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
    totalModelSize,
    findInstalledCatalogVariant,
    deleteModel,
    importModel,
    installSystemModel,
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

  const installedColumns: DataGridColumn<AIModel>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const model = row.original
        return (
          <div>
            <div className="flex items-center gap-2 font-medium">
              <span>{model.name}</span>
              {recommendedInstalledModel?.id === model.id && (
                <Badge variant="secondary" title="Used by default when a tool needs a detector">
                  Default detector
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {model.modelVersion || model.model_version || `v${model.version}`}
            </span>
          </div>
        )
      },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category || "uncategorized"}</Badge>
      ),
    },
    {
      id: "size",
      header: "Size",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatFileSize(row.original.modelSize || 0)}
        </span>
      ),
    },
    {
      id: "classes",
      header: "Classes",
      cell: ({ row }) => (
        <span className="tabular-nums">{getModelClassCount(row.original) || "—"}</span>
      ),
    },
    {
      id: "prediction",
      header: "Prediction",
      cell: ({ row }) => (
        <Badge
          variant={isModelUsable(row.original) ? "secondary" : "outline"}
          title={getModelUsageHint(row.original)}
        >
          {getPredictionReadinessLabel(row.original)}
        </Badge>
      ),
    },
    {
      id: "backend",
      header: "Backend",
      cell: ({ row }) => (
        <Badge variant="outline">
          {(row.original.backend || "cpu").toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const model = row.original
        return (
          <div className="flex justify-end gap-1.5">
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
        )
      },
    },
  ]

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
          icon={Layers}
          label="Capabilities ready"
          value={`${countReadyCapabilities(availableModels)}/${totalCapabilities}`}
        />
      </div>

      <Alert>
        <Cpu className="size-4" />
        <AlertDescription>
          Install a curated model pack matched to your hardware, or import a local
          file. Each pack bundles several models so the copilot can aggregate them
          for auto-labeling. Prediction generation always stays local and offline.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="installed" className="gap-4">
        <TabsList>
          <TabsTrigger value="installed">Installed models</TabsTrigger>
          <TabsTrigger value="catalog">Model packs</TabsTrigger>
          <TabsTrigger value="library">Model library</TabsTrigger>
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
                    No local models yet — install a model pack or import one.
                  </p>
                </div>
              ) : (
                <DataGrid
                  data={availableModels}
                  columns={installedColumns}
                  enableSearch={false}
                  enableSorting={false}
                  enablePagination={false}
                  showAggregations={false}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model packs */}
        <TabsContent value="catalog">
          <ModelPacks
            systemModels={systemModels}
            findInstalledCatalogVariant={findInstalledCatalogVariant}
            installSystemModel={installSystemModel}
            refreshModels={refreshModels}
          />
        </TabsContent>

        {/* Model library — grouped by capability/tool across CV + NLP */}
        <TabsContent value="library">
          <ModelLibrary availableModels={availableModels} />
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
