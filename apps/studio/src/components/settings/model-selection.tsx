import { useMemo } from "react"
import { Brain, Info } from "lucide-react"
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
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import { SettingsSection } from "@/components/settings/settings-ui"

export function ModelSelection() {
  const { availableModels, selectedModelId, selectModel, saveModelSelection } =
    useAIModelViewModel()
  const selectedModel = useMemo(
    () => availableModels.find((model) => model.id === selectedModelId),
    [availableModels, selectedModelId]
  )

  const handleSave = async () => {
    if (!selectedModel) {
      toast.error("No model selected", {
        description: "Please select a model before saving.",
      })
      return
    }
    try {
      await saveModelSelection(selectedModelId)
      toast("Model saved", {
        description: `Model path saved to settings: ${selectedModel.modelPath}`,
      })
    } catch {
      toast.error("Error", { description: "Failed to save model settings." })
    }
  }

  return (
    <SettingsSection
      icon={Brain}
      title="Model Selection"
      description="Choose the default AI model for detection and analysis"
      action={
        <Button onClick={handleSave} disabled={!selectedModelId} size="sm">
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <RadioGroup value={selectedModelId} onValueChange={selectModel}>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Select</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>File Path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableModels.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No models installed yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  availableModels.map((model) => (
                    <TableRow
                      key={model.id}
                      className={
                        selectedModelId === model.id ? "bg-primary/5" : ""
                      }
                    >
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
                      <TableCell className="text-muted-foreground">
                        {model.modelPath || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </RadioGroup>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Models must remain at their original file path. Moving or deleting a
            model file will stop it from working in the app. Custom model upload
            is not available in this build.
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}
