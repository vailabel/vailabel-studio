import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Import, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  getPredictionReadinessLabel,
  getModelClassCount,
  getModelUnsupportedReason,
  isModelPredictionReady,
  willModelConvertOnRun,
} from "@/lib/ai-model-metadata"
import {
  useAIModelViewModel,
  type CatalogSystemModel,
  type CatalogSystemModelVariant,
} from "@/viewmodels/ai-model-viewmodel"

interface AIModelModalProps {
  onClose: () => void
}

function getRecommendedVariant(
  model?: CatalogSystemModel | null
): CatalogSystemModelVariant | null {
  if (!model?.variants?.length) return null
  return (
    model.variants.find((variant) => variant.recommended && variant.available) ||
    model.variants.find((variant) => variant.available) ||
    null
  )
}

export const AIModelSelectModal = ({ onClose }: AIModelModalProps) => {
  const navigate = useNavigate()
  const {
    availableModels,
    recommendedInstalledModel,
    recommendedSystemModel,
    selectedModel,
    selectedModelId,
    systemModels,
    selectModel,
    saveModelSelection,
    installSystemModel,
    activateModel,
  } = useAIModelViewModel()
  const [isInstallingRecommended, setIsInstallingRecommended] = useState(false)

  const recommendedVariant = getRecommendedVariant(recommendedSystemModel)

  const handleSave = async () => {
    if (!selectedModelId) return
    try {
      await saveModelSelection(selectedModelId)
      toast("Model selected", {
        description: "This model is ready for AI-assisted annotation.",
      })
      onClose()
    } catch {
      toast.error("Error", {
        description: "Failed to save selected model.",
      })
    }
  }

  const handleInstallRecommended = async () => {
    if (!recommendedSystemModel || !recommendedVariant) {
      toast.error("No installable model available", {
        description: "Open the model manager to choose a model to install.",
      })
      return
    }

    setIsInstallingRecommended(true)
    try {
      const installed = await installSystemModel(
        recommendedSystemModel,
        recommendedVariant
      )
      await activateModel(installed.id)
      toast("Model installed", {
        description: `${installed.name} is installed, activated, and ready for AI detect.`,
      })
      onClose()
    } catch (error) {
      toast.error("Install failed", {
        description:
          error instanceof Error
            ? error.message
            : "The recommended model could not be installed.",
      })
    } finally {
      setIsInstallingRecommended(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="min-h-[500px] max-w-5xl">
        <DialogHeader>
          <DialogTitle>Pre-annotation Models</DialogTitle>
          <DialogDescription>
            Pick an installed local model for ML-assisted labeling, or open the
            model manager to install a recommended YOLO26-family ONNX model.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Installed Models</h3>
              <p className="text-sm text-muted-foreground">
                Choose the model the annotation toolbar should use for pre-annotations.
              </p>
            </div>
            <RadioGroup value={selectedModelId} onValueChange={selectModel}>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Use</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Model Version</TableHead>
                      <TableHead>Labels</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Backend</TableHead>
                      <TableHead>Prediction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell>
                            <RadioGroupItem
                              value={model.id}
                              id={model.id}
                              aria-label={`Select ${model.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Label htmlFor={model.id} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span>{model.name}</span>
                                {recommendedInstalledModel?.id === model.id && (
                                  <Badge variant="secondary">Default</Badge>
                                )}
                              </div>
                            </Label>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {model.modelVersion || model.model_version || model.version}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getModelClassCount(model) || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {model.isActive && (
                                <Badge className="bg-green-600 hover:bg-green-600">
                                  Active
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {model.status || "ready"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {model.backend?.toUpperCase() || "CPU"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isModelPredictionReady(model)
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {getPredictionReadinessLabel(model)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No local models imported yet. Use “Install recommended
                          model” below to download a ready-to-run detector.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </RadioGroup>
            <Alert>
              <AlertDescription>
                {selectedModel
                  ? isModelPredictionReady(selectedModel)
                    ? `Selected model version: ${selectedModel.modelVersion || selectedModel.model_version || selectedModel.version}. Review and correct the generated pre-annotations before accepting them.`
                    : willModelConvertOnRun(selectedModel)
                    ? `Selected model version: ${selectedModel.modelVersion || selectedModel.model_version || selectedModel.version}. This checkpoint can be converted to ONNX automatically the first time you run AI detect.`
                    : getModelUnsupportedReason(selectedModel) ||
                      "The selected model is not ready for AI detect yet."
                  : recommendedSystemModel
                    ? `Recommended first import: ${recommendedSystemModel.name} with the nano variant for fast image pre-annotations.`
                    : "Choose or import a model before running AI annotation."}
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Reference Catalog</h3>
                <p className="text-sm text-muted-foreground">
                  Curated install suggestions modeled after Label Studio style
                  ML-assisted labeling workflows.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose()
                  navigate("/ai-models")
                }}
              >
                <Import className="mr-2 h-4 w-4" />
                Open AI Assistant
              </Button>
            </div>
            <ScrollArea className="h-[340px] rounded-md border p-4">
              <div className="space-y-4">
                {systemModels.map((model) => (
                  <div
                    key={model.id}
                    className={`rounded-lg border p-3 ${
                      recommendedSystemModel?.id === model.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{model.name}</p>
                          {recommendedSystemModel?.id === model.id && (
                            <Badge>Recommended</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {model.description}
                        </p>
                      </div>
                      <Badge variant="outline">{model.category}</Badge>
                    </div>
                    {model.variants?.length ? (
                      <p className="mb-2 text-xs text-muted-foreground">
                        Variants:{" "}
                        {model.variants.map((variant) => variant.modelVersion || variant.name).join(", ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Install from the AI Models page, or import a compatible
                      local checkpoint if you already have one.
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          {recommendedVariant ? (
            <Button
              variant="secondary"
              className="mr-auto"
              onClick={handleInstallRecommended}
              disabled={isInstallingRecommended}
            >
              {isInstallingRecommended ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Installing {recommendedVariant.modelVersion || recommendedVariant.name}...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Install recommended model
                </>
              )}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedModelId}>
            Use Selected Model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
