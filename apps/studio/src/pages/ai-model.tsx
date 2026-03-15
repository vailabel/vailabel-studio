import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Brain,
  CheckCircle,
  Cpu,
  HardDrive,
  Import,
  Loader2,
  Settings,
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
import {
  useAIModelViewModel,
  type SystemModel,
  type SystemModelVariant,
} from "@/viewmodels/ai-model-viewmodel"
import {
  getAIModelMetadata,
  getModelClassCount,
  getModelUnsupportedReason,
  isModelPredictionReady,
} from "@/lib/ai-model-metadata"
import { aiModelFormSchema, type AIModelFormData } from "@/lib/schemas/ai-model"
import { useToast } from "@/hooks/use-toast"
import type { AIModel } from "@/types/core"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() || ""
}

function buildCatalogVariantKey(model: SystemModel, variant: SystemModelVariant) {
  return `${model.id}:${variant.slug || variant.modelVersion || variant.name}`
}

function getInstalledCatalogVariant(
  models: AIModel[],
  model: SystemModel,
  variant: SystemModelVariant
) {
  const expectedVersion = normalizeValue(variant.modelVersion)
  const expectedCategory = normalizeValue(model.category)
  const expectedFamily = normalizeValue(model.family)
  const expectedVariant = normalizeValue(variant.variant)

  return (
    models.find((entry) => {
      const installedVersion = normalizeValue(
        entry.modelVersion || entry.model_version
      )

      if (expectedVersion && installedVersion === expectedVersion) {
        return true
      }

      return (
        normalizeValue(entry.category) === expectedCategory &&
        normalizeValue(entry.family) === expectedFamily &&
        normalizeValue(entry.variant) === expectedVariant
      )
    }) || null
  )
}

export default function AIModelListPage() {
  const {
    availableModels = [],
    systemModels = [],
    isLoading,
    isImportingModel,
    installingCatalogVariantKey,
    recommendedInstalledModel,
    recommendedSystemModel,
    selectedModel,
    deleteModel,
    activateModel,
    importModel,
    installSystemModel,
    refreshModels,
  } = useAIModelViewModel()
  const { toast } = useToast()
  const [showAddModelModal, setShowAddModelModal] = useState(false)

  const form = useForm<AIModelFormData>({
    resolver: zodResolver(aiModelFormSchema),
    defaultValues: {
      name: "",
      description: "",
      version: "1.0.0",
      category: "detection",
      modelFilePath: "",
      configFilePath: "",
    },
  })

  const onSubmit = async (data: AIModelFormData) => {
    try {
      const importedModel = await importModel({
        name: data.name,
        description: data.description,
        version: data.version,
        category: data.category,
        modelFilePath: data.modelFilePath,
        configFilePath: data.configFilePath || undefined,
      })
      await activateModel(importedModel.id)
      await refreshModels()
      toast({
        title: "Model imported",
        description: isModelPredictionReady(importedModel)
          ? `${importedModel.name} is ready for offline prediction generation.`
          : getModelUnsupportedReason(importedModel) ||
            `${importedModel.name} was imported, but it is not prediction-ready yet.`,
      })
      setShowAddModelModal(false)
      form.reset({
        name: "",
        description: "",
        version: "1.0.0",
        category: "detection",
        modelFilePath: "",
        configFilePath: "",
      })
    } catch (error) {
      console.error("Failed to import model:", error)
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "The model could not be imported.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return

    try {
      await deleteModel(modelId)
      toast({
        title: "Model deleted",
        description: "The local model entry was removed.",
      })
    } catch (error) {
      console.error("Failed to delete model:", error)
      toast({
        title: "Delete failed",
        description: "The model could not be removed.",
        variant: "destructive",
      })
    }
  }

  const handleSetActiveModel = async (modelId: string) => {
    try {
      await activateModel(modelId)
      toast({
        title: "Model activated",
        description: "This model is now the default local detector.",
      })
    } catch (error) {
      console.error("Failed to activate model:", error)
      toast({
        title: "Activation failed",
        description: "The model could not be activated.",
        variant: "destructive",
      })
    }
  }

  const handleInstallVariant = async (
    model: SystemModel,
    variant: SystemModelVariant
  ) => {
    try {
      const installedModel = await installSystemModel(model, variant)
      await activateModel(installedModel.id)
      await refreshModels()
      toast({
        title: "Model installed",
        description: isModelPredictionReady(installedModel)
          ? `${installedModel.name} was installed and activated for offline prediction generation.`
          : getModelUnsupportedReason(installedModel) ||
            `${installedModel.name} was installed, but it is not prediction-ready yet.`,
      })
    } catch (error) {
      console.error("Failed to install model:", error)
      toast({
        title: "Install failed",
        description:
          error instanceof Error
            ? error.message
            : "The model could not be installed from the catalog.",
        variant: "destructive",
      })
    }
  }

  const totalModelSize = availableModels.reduce(
    (sum, model) => sum + (model.modelSize || 0),
    0
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Models</h1>
            <p className="text-muted-foreground">
              Import and manage local models for offline pre-annotations and Label Studio-style review workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Installed Models</p>
                  <p className="text-2xl font-bold">{availableModels.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Storage</p>
                  <p className="text-2xl font-bold">
                    {formatFileSize(totalModelSize)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Active Model</p>
                  <p className="text-lg font-bold">
                    {selectedModel?.name || "None"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Mode</p>
                  <p className="text-lg font-bold">Offline Only</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowAddModelModal(true)}>
            <Import className="mr-2 h-4 w-4" />
            Import Local Model
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        <AlertDescription>
          Install a curated checkpoint from the catalog or import an existing
          local file. Once a model is added, prediction generation stays local
          and offline.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="installed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="installed">Installed Models</TabsTrigger>
          <TabsTrigger value="catalog">Reference Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="installed">
          <Card>
            <CardHeader>
              <CardTitle>Your Local Models</CardTitle>
              <CardDescription>
                Models available for local prediction generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading models...
                </div>
              ) : availableModels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No local models imported yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Model Version</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Labels</TableHead>
                      <TableHead>Status</TableHead>
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
                            {recommendedInstalledModel?.id === model.id && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {model.modelVersion || model.model_version || model.version}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.category || "uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>v{model.version}</TableCell>
                        <TableCell>{formatFileSize(model.modelSize || 0)}</TableCell>
                        <TableCell>
                          {getModelClassCount(model) || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {model.isActive ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {model.status || "ready"}
                              </Badge>
                            )}
                            {getAIModelMetadata(model).labelSource && (
                              <div className="text-xs text-muted-foreground">
                                {getAIModelMetadata(model).labelSource}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant={
                                isModelPredictionReady(model)
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {isModelPredictionReady(model) ? "Ready" : "Unsupported"}
                            </Badge>
                            {!isModelPredictionReady(model) && (
                              <div className="max-w-xs text-xs text-muted-foreground">
                                {getModelUnsupportedReason(model)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(model.backend || "cpu").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!model.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetActiveModel(model.id)}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(model.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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

        <TabsContent value="catalog">
          <Card>
            <CardHeader>
              <CardTitle>Reference Catalog</CardTitle>
              <CardDescription>
                Curated model families you can install directly or mirror with
                your own local checkpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {systemModels.map((model) => (
                  <Card
                    key={model.id}
                    className={`border-dashed ${
                      recommendedSystemModel?.id === model.id
                        ? "border-primary"
                        : ""
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span>{model.name}</span>
                        {recommendedSystemModel?.id === model.id && (
                          <Badge>Recommended</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Category</span>
                        <Badge variant="outline">{model.category}</Badge>
                      </div>
                      {model.variants?.length ? (
                        <div className="flex items-center justify-between">
                          <span>Default Variant</span>
                          <span>
                            {model.variants.find((variant) => variant.recommended)?.modelVersion ||
                              model.variants[0]?.modelVersion ||
                              model.variants[0]?.name}
                          </span>
                        </div>
                      ) : null}
                      {model.requirements?.minMemory && (
                        <div className="flex items-center justify-between">
                          <span>Min Memory</span>
                          <span>{model.requirements.minMemory} MB</span>
                        </div>
                      )}
                      {model.variants?.length ? (
                        <div className="space-y-3">
                          {model.variants.map((variant) => {
                            const installedVariant = getInstalledCatalogVariant(
                              availableModels,
                              model,
                              variant
                            )
                            const variantMetadata = getAIModelMetadata({
                              modelMetadata: variant.modelMetadata,
                            })
                            const variantKey = buildCatalogVariantKey(
                              model,
                              variant
                            )
                            const isInstalling =
                              installingCatalogVariantKey === variantKey

                            return (
                              <div
                                key={variantKey}
                                className="rounded-lg border bg-background/70 p-3"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium text-foreground">
                                        {variant.modelVersion || variant.name}
                                      </span>
                                      {variant.recommended && <Badge>Recommended</Badge>}
                                      {installedVariant && (
                                        <Badge variant="secondary">Installed</Badge>
                                      )}
                                      {installedVariant?.isActive && (
                                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                                          Active
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs">
                                      {typeof variant.size === "number" && (
                                        <span>{formatFileSize(variant.size)}</span>
                                      )}
                                      {typeof variant.accuracy === "number" && (
                                        <span>{variant.accuracy}% mAP</span>
                                      )}
                                      {variant.speed && <span>{variant.speed}</span>}
                                      {getModelClassCount({
                                        modelMetadata: variant.modelMetadata,
                                      }) > 0 && (
                                        <span>
                                          {getModelClassCount({
                                            modelMetadata: variant.modelMetadata,
                                          })}{" "}
                                          classes
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <Badge
                                        variant={
                                          variantMetadata.supportsPrediction
                                            ? "secondary"
                                            : "outline"
                                        }
                                      >
                                        {variantMetadata.supportsPrediction
                                          ? "Prediction ready"
                                          : "Reference install"}
                                      </Badge>
                                      {variantMetadata.unsupportedReason && (
                                        <p>{variantMetadata.unsupportedReason}</p>
                                      )}
                                    </div>
                                  </div>

                                  {installedVariant ? (
                                    installedVariant.isActive ? (
                                      <Button size="sm" variant="outline" disabled>
                                        Active
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleSetActiveModel(installedVariant.id)
                                        }
                                      >
                                        Activate
                                      </Button>
                                    )
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleInstallVariant(model, variant)
                                      }
                                      disabled={isInstalling}
                                    >
                                      {isInstalling ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Installing...
                                        </>
                                      ) : (
                                        "Install"
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p>No installable variants are defined for this family.</p>
                      )}
                      <p>
                        Installed catalog models are copied into the app data
                        directory so they can be reused locally after download.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddModelModal} onOpenChange={setShowAddModelModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Local Model</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <AIModelForm
              control={form.control}
              errors={form.formState.errors}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModelModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isImportingModel}>
                {isImportingModel ? "Importing..." : "Import Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
