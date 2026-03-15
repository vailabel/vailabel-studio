import { useEffect, useMemo, useState } from "react"
import { AIModel } from "@vailabel/core"
import { services } from "@/services"
import { SYSTEM_MODELS } from "@/lib/system-model-catalog"
import type { SystemModel } from "@/lib/schemas/ai-model"

export const useAIModelViewModel = () => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [modelPath, setModelPath] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(
    null
  )

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
    systemModels: SYSTEM_MODELS,
    selectedModel,
    selectedModelId,
    modelPath,
    isLoading,
    downloadingModelId,
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
    deleteModel: async (modelId: string) => {
      await services.getAIModelService().delete(modelId)
      setAvailableModels((current) =>
        current.filter((model) => model.id !== modelId)
      )
      if (selectedModelId === modelId) {
        setSelectedModelId("")
        setModelPath("")
        await services.getSettingsService().update("selectedModelId", "")
        await services.getSettingsService().update("modelPath", "")
      }
    },
    activateModel: async (modelId: string) => {
      const nextModel = availableModels.find((model) => model.id === modelId)
      if (!nextModel) return

      await Promise.all(
        availableModels.map((model) =>
          services.getAIModelService().update(model.id, {
            isActive: model.id === modelId,
            lastUsed:
              model.id === modelId ? new Date().toISOString() : model.lastUsed,
          })
        )
      )

      setAvailableModels((current) =>
        current.map((model) => ({
          ...model,
          isActive: model.id === modelId,
          lastUsed:
            model.id === modelId ? (new Date() as any) : model.lastUsed,
        }))
      )
      setSelectedModelId(modelId)
      setModelPath(nextModel.modelPath || "")
      await services.getSettingsService().update("selectedModelId", modelId)
      await services
        .getSettingsService()
        .update("modelPath", nextModel.modelPath || "")
    },
    downloadSystemModel: async (
      systemModel: SystemModel,
      variantName?: string
    ) => {
      const variant = systemModel.variants?.find(
        (candidate) => candidate.name === variantName
      )
      const downloadUrl = variant?.downloadUrl || systemModel.downloadUrl
      if (!downloadUrl) {
        throw new Error("No download URL is defined for this model.")
      }

      setDownloadingModelId(
        `${systemModel.id}:${variant?.name || "default"}`
      )
      try {
        const downloadedModel =
          await services.getAIModelService().downloadSystemModel({
            systemId: systemModel.id,
            name: systemModel.name,
            description: systemModel.description,
            category: systemModel.category,
            variantName: variant?.name,
            version: "1.0.0",
            downloadUrl,
            expectedSize: variant?.size || systemModel.size,
          })

        setAvailableModels((current) => {
          const existingIndex = current.findIndex(
            (model) => model.id === downloadedModel.id
          )
          if (existingIndex === -1) return [downloadedModel, ...current]
          return current.map((model) =>
            model.id === downloadedModel.id ? downloadedModel : model
          )
        })

        return downloadedModel
      } finally {
        setDownloadingModelId(null)
      }
    },
    refreshModels: loadData,
  }
}
