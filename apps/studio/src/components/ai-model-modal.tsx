import { useState } from "react"
import { motion } from "framer-motion"
import { X, Check } from "lucide-react"
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
import { ElectronFileInput } from "./electron-file"
import { useProjectsStore } from "@/hooks/use-store"

interface AIModelModalProps {
  onClose: () => void
}

export function AIModelSelectModal({ onClose }: AIModelModalProps) {
  const { toast } = useToast()
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    undefined
  )
  const [isSaving, setIsSaving] = useState(false)
  const { getAvailableModels, uploadCustomModel, selectModel, updateSetting } =
    useProjectsStore()

  const handleModelSave = async (
    e: React.ChangeEvent<HTMLInputElement> | { target: { files: string[] } }
  ) => {
    // Support both Electron proxy and web input events
    let filePath: string | undefined
    if (e?.target?.files) {
      // ElectronFileInput: files is an array of file paths (string)
      // Web: files is a FileList
      if (typeof e.target.files[0] === "string") {
        filePath = e.target.files[0]
      } else if (e.target.files[0] instanceof File) {
        // For web, get the path or name (web doesn't have path, so use name)
        filePath = (e.target.files[0] as File).name
      }
    }
    if (!filePath) {
      toast({
        title: "No file selected",
        description: "Please select a .pt model file.",
        variant: "destructive",
      })
      return
    }
    // Extract file name from path
    const fileName = filePath.split(/[\\/]/).pop() || "model.pt"
    if (!fileName.endsWith(".pt")) {
      toast({
        title: "Invalid file",
        description: "Please select a valid PyTorch model file (.pt)",
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      const now = new Date()
      const model: AIModel = {
        id: fileName,
        name: fileName,
        description: "",
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
        modelPath: filePath,
        configPath: "",
        modelSize: 0, // Size unknown unless you fetch it via Node
        isCustom: true,
      }
      await uploadCustomModel(model)
      const models = await getAvailableModels()
      setAvailableModels(models)
      const saved =
        models.find((m) => m.name === fileName) || models[models.length - 1]
      setSelectedModelId(saved?.id)
      toast({
        title: "Model saved",
        description: `Saved model ${fileName}\nFile path: ${filePath}`,
      })
    } catch (error) {
      console.error("Failed to save model:", error)
      toast({
        title: "Save failed",
        description: "Failed to save the model",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleModelSelect = async () => {
    if (!selectedModelId) return
    try {
      await selectModel(selectedModelId)
      await updateSetting?.("modalSelected", selectedModelId)
      const selectedModel = availableModels.find(
        (m) => m.id === selectedModelId
      )
      toast({
        title: "Model selected",
        description: `Now using ${selectedModel?.name || selectedModelId} for detection`,
      })
      onClose()
    } catch (error) {
      console.error("Failed to select model:", error)
      toast({
        title: "Error",
        description: "Failed to select the model",
        variant: "destructive",
      })
    }
  }

  const handleRadioChange = async (modelId: string) => {
    setSelectedModelId(modelId)
    try {
      await updateSetting?.("modalSelected", modelId)
    } catch {
      toast({
        title: "Error",
        description: "Failed to update selected model in settings.",
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

            <div className="mt-8">
              <Label
                htmlFor="model-save"
                className="dark:text-gray-300 flex items-center"
              >
                Save custom model path
              </Label>
              <ElectronFileInput
                onChange={handleModelSave}
                accept=".pt"
                className="flex-1 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only YOLOv8 PyTorch models (.pt) are supported
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleModelSelect}
            disabled={!selectedModelId || isSaving}
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Use Selected Model
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
