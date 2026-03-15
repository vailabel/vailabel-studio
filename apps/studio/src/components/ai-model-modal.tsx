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
import { Import } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"

interface AIModelModalProps {
  onClose: () => void
}

export const AIModelSelectModal = ({ onClose }: AIModelModalProps) => {
  const { toast } = useToast()
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
  } = useAIModelViewModel()

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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="min-h-[500px] max-w-5xl">
        <DialogHeader>
          <DialogTitle>Pre-annotation Models</DialogTitle>
          <DialogDescription>
            Pick an installed local model for ML-assisted labeling, or open the model manager to import the recommended YOLO26 family.
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
                      <TableHead>Status</TableHead>
                      <TableHead>Backend</TableHead>
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
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No local models imported yet.
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
                  ? `Selected model version: ${selectedModel.modelVersion || selectedModel.model_version || selectedModel.version}. Review and correct the generated pre-annotations before accepting them.`
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
                  Local-only import suggestions modeled after Label Studio style ML-assisted labeling workflows.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose()
                  navigate("/ai-model")
                }}
              >
                <Import className="mr-2 h-4 w-4" />
                Manage Models
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
                      Import a compatible local checkpoint from the AI Models
                      page to use this family offline.
                    </p>
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
