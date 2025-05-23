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
import { AIModel } from "@vailabel/core"
import { useAIModelStore } from "@/hooks/use-ai-model-store"

export function ModelSelection() {
  const { toast } = useToast()
  const { getAIModels, getSelectedModel } = useAIModelStore()
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  useEffect(() => {
    // Load models on mount
    const fetchModels = async () => {
      try {
        const models = await getAIModels()
        setAvailableModels(models)
        const selected = await getSelectedModel()
        if (selected) setSelectedModelId(selected.id)
      } catch {
        toast({
          title: "Error",
          description: "Failed to load models.",
          variant: "destructive",
        })
      }
    }
    fetchModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRadioChange = (modelId: string) => {
    setSelectedModelId(modelId)
    // Optionally, persist the selected model if your store supports it
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-8 flex-1">
        <div className="flex-1 min-w-[300px]">
          <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
            Select a pre-trained model from the list below.
          </p>

          <RadioGroup value={selectedModelId} onValueChange={handleRadioChange}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 dark:bg-gray-800">
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
                          ? "bg-blue-50 dark:bg-blue-900"
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
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Note:</strong> All models must remain in their specific
              file path. If you delete or move a model file, it will no longer
              work in the app.
            </p>
          </RadioGroup>

          <div className="mt-8">
            <Label
              htmlFor="model-save"
              className="dark:text-gray-300 flex items-center"
            >
              Save custom model path
            </Label>
            <div className="text-gray-400 text-xs mt-2">
              Custom model upload is not available in this build.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
