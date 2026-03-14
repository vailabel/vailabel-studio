import { useEffect, useMemo, useState } from "react"
import { AIModel } from "@vailabel/core"
import { services } from "@/services"

export const useAIModelViewModel = () => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [modelPath, setModelPath] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [models, selectedModelSetting, modelPathSetting] = await Promise.all([
        services.getAIModelService().list(),
        services.getSettingsService().getByKey("selectedModelId"),
        services.getSettingsService().getByKey("modelPath"),
      ])
      setAvailableModels(models)
      setSelectedModelId(selectedModelSetting.value || "")
      setModelPath(modelPathSetting.value || "")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const selectedModel = useMemo(
    () =>
      availableModels.find((model) => model.id === selectedModelId) || null,
    [availableModels, selectedModelId]
  )

  return {
    availableModels,
    selectedModel,
    selectedModelId,
    modelPath,
    isLoading,
    selectModel: setSelectedModelId,
    saveModelSelection: async () => {
      await services
        .getSettingsService()
        .update("selectedModelId", selectedModelId || "")
    },
    saveModelPath: async (nextModelPath: string) => {
      setModelPath(nextModelPath)
      await services.getSettingsService().update("modelPath", nextModelPath)
    },
    refreshModels: loadData,
  }
}
