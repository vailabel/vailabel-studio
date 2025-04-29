"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import {
  getAvailableModels,
  uploadCustomModel,
  selectModel,
} from "@/lib/ai-utils"

interface AIModelModalProps {
  onClose: () => void
}

export function AIModelModal({ onClose }: AIModelModalProps) {
  const { toast } = useToast()
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load available models on mount
  useState(() => {
    const loadModels = async () => {
      try {
        const models = await getAvailableModels()
        setAvailableModels(models)
        if (models.length > 0) {
          setSelectedModel(models[0])
        }
      } catch (error) {
        console.error("Failed to load models:", error)
        toast({
          title: "Error",
          description: "Failed to load available models",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadModels()
  })

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's a .pt file
    if (!file.name.endsWith(".pt")) {
      toast({
        title: "Invalid file",
        description: "Please upload a valid PyTorch model file (.pt)",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      await uploadCustomModel(file)

      // Add the new model to the list
      const newModelName = file.name
      setAvailableModels([...availableModels, newModelName])
      setSelectedModel(newModelName)

      toast({
        title: "Model uploaded",
        description: `Successfully uploaded ${file.name}`,
      })
    } catch (error) {
      console.error("Failed to upload model:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload the model",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleModelSelect = async () => {
    try {
      await selectModel(selectedModel)

      toast({
        title: "Model selected",
        description: `Now using ${selectedModel} for detection`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 dark:text-white"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">AI Detection Models</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 dark:text-gray-300" />
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a pre-trained model or upload your own custom YOLOv8 model
            (.pt file)
          </p>

          {isLoading ? (
            <div className="my-8 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
            </div>
          ) : (
            <RadioGroup
              value={selectedModel}
              onValueChange={setSelectedModel}
              className="mt-4"
            >
              {availableModels.map((model) => (
                <div key={model} className="flex items-center space-x-2">
                  <RadioGroupItem value={model} id={model} />
                  <Label htmlFor={model} className="dark:text-gray-300">
                    {model}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          <div className="mt-6">
            <Label htmlFor="model-upload" className="dark:text-gray-300">
              Upload custom model
            </Label>
            <div className="mt-1 flex">
              <Input
                id="model-upload"
                type="file"
                accept=".pt"
                onChange={handleModelUpload}
                disabled={isUploading}
                className="flex-1 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {isUploading && (
                <div className="ml-2 flex h-10 w-10 items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only YOLOv8 PyTorch models (.pt) are supported
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button onClick={handleModelSelect} disabled={!selectedModel}>
              <Check className="mr-2 h-4 w-4 dark:text-gray-300" />
              Use Selected Model
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
