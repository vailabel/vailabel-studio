import { useState, useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { useAIModels } from "@/hooks/api/ai-model-hooks"
import { useSetting, useUpdateSettings } from "@/hooks/api/settings-hooks"
import { Button } from "@/components/ui/button"

export function ModelSelection() {
  const { toast } = useToast()
  const { data: availableModels = [] } = useAIModels("") // Get all models
  const { data: selectedModelSetting } = useSetting("selectedModelId")
  const updateSettingsMutation = useUpdateSettings()
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  // Set selected model when settings are loaded
  useEffect(() => {
    if (selectedModelSetting?.value) {
      setSelectedModelId(selectedModelSetting.value)
    } else if (availableModels.length > 0 && !selectedModelId) {
      setSelectedModelId(availableModels[0].id)
    }
  }, [selectedModelSetting, availableModels, selectedModelId])

  const handleRadioChange = (modelId: string) => {
    setSelectedModelId(modelId)
    // Optionally, persist the selected model if your store supports it
  }

  const handleSave = async () => {
    const selectedModel = availableModels.find((m) => m.id === selectedModelId)
    if (selectedModel) {
      try {
        await updateSettingsMutation.mutateAsync({
          key: "modelPath",
          value: selectedModel.modelPath || "",
        })
        await updateSettingsMutation.mutateAsync({
          key: "selectedModelId",
          value: selectedModelId,
        })
        toast({
          title: "Model Saved",
          description: `Model path saved to settings: ${selectedModel.modelPath}`,
        })
      } catch {
        toast({
          title: "Error",
          description: "Failed to save model settings.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "No Model Selected",
        description: "Please select a model before saving.",
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-8 flex-1">
        <div className="flex-1 min-w-[300px]">
          <p className="text-base text-muted-foreground mb-4">
            Select a pre-trained model from the list below.
          </p>

          <RadioGroup value={selectedModelId} onValueChange={handleRadioChange}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
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
                        selectedModelId === model.id ? "bg-primary/10" : ""
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
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Note:</strong> All models must remain in their specific
              file path. If you delete or move a model file, it will no longer
              work in the app.
            </p>
          </RadioGroup>

          <div className="mt-8">
            <Label htmlFor="model-save" className="flex items-center">
              Save custom model path
            </Label>
            <div className="text-muted-foreground text-xs mt-2">
              Custom model upload is not available in this build.
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={!selectedModelId}>
          Save
        </Button>
      </div>
    </div>
  )
}
