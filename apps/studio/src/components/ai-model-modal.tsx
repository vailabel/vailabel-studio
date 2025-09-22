import { useState, useEffect } from "react"
import { X } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { AIModel } from "@vailabel/core"
import { useServices } from "@/services/ServiceProvider"

interface AIModelModalProps {
  onClose: () => void
}

export const AIModelSelectModal = ({ onClose }: AIModelModalProps) => {
  const { toast } = useToast()
  const services = useServices()

  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  // Fetch models and selected model on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await services.getAIModelService().getAIModelsByProjectId("") // Get all models
        setAvailableModels(models)
        let selected = ""
        try {
          const modalSelected = await services.getSettingsService().getSetting("modalSelected")
          // modalSelected may be an object, so get the value if needed
          const selectedId =
            typeof modalSelected === "string"
              ? modalSelected
              : modalSelected?.value || ""
          if (selectedId && models.some((m) => m.id === selectedId)) {
            selected = selectedId
          } else if (models.length > 0) {
            selected = models[0].id
          }
        } catch {
          if (models.length > 0) {
            selected = models[0].id
          }
        }
        setSelectedModelId(selected)
      } catch (error) {
        console.error("Failed to load models:", error)
      }
    }
    loadModels()
  }, [])

  const handleRadioChange = async (id: string) => {
    setSelectedModelId(id)
    try {
      await services.getSettingsService().saveOrUpdateSetting("modalSelected", id)
    } catch {
      toast({
        title: "Error",
        description: "Failed to update selected model in settings.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!selectedModelId) return
    try {
      await services.getSettingsService().saveOrUpdateSetting("modalSelected", selectedModelId)
      toast({
        title: "Model saved",
        description: `Selected model has been saved!`,
      })
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
      <DialogContent className="max-w-3xl min-h-[400px]">
        <DialogHeader>
          <DialogTitle>AI Detection Models</DialogTitle>
          <DialogDescription>
            Select a pre-trained model or select your own custom YOLOv8 model (.pt file)
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-8 flex-1">
          <div className="flex-1 min-w-[300px]">
            <RadioGroup
              value={selectedModelId}
              onValueChange={handleRadioChange}
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-2 font-semibold text-left">
                        Select
                      </TableHead>
                      <TableHead className="p-2 font-semibold text-left">
                        Name
                      </TableHead>
                      <TableHead className="p-2 font-semibold text-left">
                        File Path
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableModels.map((model) => (
                      <TableRow
                        key={model.id}
                        className={
                          selectedModelId === model.id
                            ? "bg-primary/10"
                            : ""
                        }
                      >
                        <TableCell className="p-2 align-middle">
                          <RadioGroupItem
                            value={model.id}
                            id={model.id}
                            aria-label={`Select ${model.name}`}
                            className="mt-0.5"
                          />
                        </TableCell>
                        <TableCell className="p-2 align-middle">
                          <Label htmlFor={model.id} className="cursor-pointer">
                            {model.name}
                          </Label>
                        </TableCell>
                        <TableCell className="p-2 align-middle">
                          {model.modelPath || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Alert className="mt-4">
                <AlertDescription>
                  <strong>Note:</strong> All models must remain in their specific
                  file path. If you delete or move a model file, it will no longer
                  work in the app.
                </AlertDescription>
              </Alert>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedModelId}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
