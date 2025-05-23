import { useState } from "react"
import { motion } from "framer-motion"
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
import { useToast } from "@/hooks/use-toast"
import { AIModel } from "@vailabel/core"
import { useAIModelStore } from "@/hooks/use-ai-model-store"
import { useSettingsStore } from "@/hooks/use-settings-store"

interface AIModelModalProps {
  onClose: () => void
}

export function AIModelSelectModal({ onClose }: AIModelModalProps) {
  const { toast } = useToast()
  const { getAIModels } = useAIModelStore()
  const { updateSetting, getSetting } = useSettingsStore()

  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  // Fetch models and selected model on mount
  useState(() => {
    ;(async () => {
      const models = await getAIModels()
      setAvailableModels(models)
      let selected = ""
      try {
        const modalSelected = await getSetting("modalSelected")
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
    })()
  })

  const handleRadioChange = async (id: string) => {
    setSelectedModelId(id)
    try {
      await updateSetting("modalSelected", id)
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
      await updateSetting("modalSelected", selectedModelId)
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
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-3xl min-h-[400px] rounded-xl p-10 shadow-2xl bg-white dark:bg-gray-800 dark:text-gray-100 flex flex-col"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">AI Detection Models</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-8 flex-1">
          <div className="flex-1 min-w-[300px]">
            <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
              Select a pre-trained model or select your own custom YOLOv8 model
              (.pt file)
            </p>

            <RadioGroup
              value={selectedModelId}
              onValueChange={handleRadioChange}
            >
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
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!selectedModelId}
          >
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
