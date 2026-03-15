import { Download, CheckCircle, Loader2 } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import type { SystemModel } from "@/lib/schemas/ai-model"

interface AIModelModalProps {
  onClose: () => void
}

export const AIModelSelectModal = ({ onClose }: AIModelModalProps) => {
  const { toast } = useToast()
  const {
    availableModels,
    selectedModel,
    selectedModelId,
    downloadingModelId,
    systemModels,
    selectModel,
    saveModelSelection,
    activateModel,
    downloadSystemModel,
    refreshModels,
  } = useAIModelViewModel()

  const handleRadioChange = (id: string) => {
    selectModel(id)
  }

  const handleSave = async () => {
    if (!selectedModelId) return
    try {
      await saveModelSelection(selectedModelId)
      toast({
        title: "Model selected",
        description: "This model is ready for AI-assisted annotation.",
      })
      onClose()
    } catch {
      toast({
        title: "Error",
        description: "Failed to save selected model.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (
    systemModel: SystemModel,
    variantName?: string
  ) => {
    try {
      const downloadedModel = await downloadSystemModel(systemModel, variantName)
      await activateModel(downloadedModel.id)
      await refreshModels()
      selectModel(downloadedModel.id)
      toast({
        title: "Model downloaded",
        description: `${downloadedModel.name} is ready to use.`,
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "The model could not be downloaded.",
        variant: "destructive",
      })
    }
  }

  const isDownloaded = (systemModel: SystemModel, variantName?: string) => {
    const normalizedVariant = variantName || "default"
    return availableModels.some(
      (model) =>
        model.id === `${systemModel.id}:${normalizedVariant}` ||
        model.id === `${systemModel.id}-${normalizedVariant}`
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl min-h-[500px]">
        <DialogHeader>
          <DialogTitle>AI Detection Models</DialogTitle>
          <DialogDescription>
            Download a system model or pick an installed one for AI-assisted annotation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Installed Models</h3>
              <p className="text-sm text-muted-foreground">
                Choose the model the annotation toolbar should use.
              </p>
            </div>
            <RadioGroup value={selectedModelId} onValueChange={handleRadioChange}>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Use</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File Path</TableHead>
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
                              {model.name}
                            </Label>
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
                          <TableCell className="max-w-[220px] truncate text-muted-foreground">
                            {model.modelPath || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No downloaded models yet. Download one from the system catalog.
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
                  ? `Selected model: ${selectedModel.name}`
                  : "Choose or download a model before running AI annotation."}
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">System Models</h3>
              <p className="text-sm text-muted-foreground">
                Download curated models directly into the desktop app.
              </p>
            </div>
            <ScrollArea className="h-[340px] rounded-md border p-4">
              <div className="space-y-4">
                {systemModels.map((model) => (
                  <div key={model.id} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {model.description}
                        </p>
                      </div>
                      <Badge variant="outline">{model.category}</Badge>
                    </div>
                    <div className="space-y-2">
                      {(model.variants || [{ name: "default" }]).map((variant) => {
                        const variantName =
                          variant.name === "default" ? undefined : variant.name
                        const downloaded = isDownloaded(model, variantName)
                        const downloadKey = `${model.id}:${variant.name}`
                        return (
                          <div
                            key={variant.name}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {variantName || "Default"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {variant.size
                                  ? `${Math.round(variant.size / 1024 / 1024)} MB`
                                  : "Model download"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {downloaded && (
                                <Badge className="bg-green-600 hover:bg-green-600">
                                  Downloaded
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant={downloaded ? "outline" : "default"}
                                disabled={downloadingModelId === downloadKey}
                                onClick={() => handleDownload(model, variantName)}
                              >
                                {downloadingModelId === downloadKey ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : downloaded ? (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <Download className="mr-2 h-4 w-4" />
                                )}
                                {downloadingModelId === downloadKey
                                  ? "Downloading..."
                                  : downloaded
                                    ? "Redownload"
                                    : "Download"}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
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
