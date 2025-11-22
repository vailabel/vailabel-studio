/**
 * AI Model ViewModel
 * Manages AI model state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "react-query"
import { useAIModels } from "@/hooks/api/ai-model-hooks"
import { useSetting, useUpdateSettings } from "@/hooks/api/settings-hooks"
import { AIModel } from "@vailabel/core"

export const useAIModelViewModel = () => {
  const queryClient = useQueryClient()

  // State
  const [selectedModelId, setSelectedModelId] = useState<string>("")

  // Queries
  const { data: availableModels = [], isLoading: modelsLoading } =
    useAIModels("") // Get all models
  const { data: selectedModelSetting } = useSetting("modalSelected")
  const { data: modelPathSetting } = useSetting("modelPath")
  const { data: pythonPathSetting } = useSetting("pythonPath")

  // Mutations
  const updateSettingsMutation = useUpdateSettings()

  // Computed values
  const selectedModel = useMemo(() => {
    return availableModels.find((model) => model.id === selectedModelId) || null
  }, [availableModels, selectedModelId])

  // Actions
  const selectModel = (modelId: string) => {
    setSelectedModelId(modelId)
  }

  const saveModelSelection = async () => {
    if (!selectedModelId) return

    try {
      await updateSettingsMutation.mutateAsync({
        key: "modalSelected",
        value: selectedModelId,
      })
      return true
    } catch (error) {
      console.error("Failed to save model selection:", error)
      throw error
    }
  }

  const saveModelPath = async (modelPath: string) => {
    try {
      await updateSettingsMutation.mutateAsync({
        key: "modelPath",
        value: modelPath,
      })
      return true
    } catch (error) {
      console.error("Failed to save model path:", error)
      throw error
    }
  }

  const savePythonPath = async (pythonPath: string) => {
    try {
      await updateSettingsMutation.mutateAsync({
        key: "pythonPath",
        value: pythonPath,
      })
      return true
    } catch (error) {
      console.error("Failed to save python path:", error)
      throw error
    }
  }

  return {
    // State
    availableModels,
    selectedModel,
    selectedModelId,
    modelPath: modelPathSetting?.value || "",
    pythonPath: pythonPathSetting?.value || "",
    isLoading: modelsLoading,

    // Actions
    selectModel,
    saveModelSelection,
    saveModelPath,
    savePythonPath,

    // Mutation state
    updateSettingsMutation,
  }
}
