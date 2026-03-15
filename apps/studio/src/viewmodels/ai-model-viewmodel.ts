import { useCallback, useEffect, useMemo, useState } from "react"
import { AIModel, ModelImportPayload } from "@/types/core"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"
import { SYSTEM_MODELS } from "@/lib/system-model-catalog"
import type { SystemModel } from "@/lib/schemas/ai-model"

function getModelType(category: string) {
  switch (category) {
    case "segmentation":
      return "segmentation"
    case "classification":
      return "classification"
    case "pose":
      return "pose_estimation"
    case "tracking":
      return "tracking"
    default:
      return "object_detection"
  }
}

export const useAIModelViewModel = () => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [modelPath, setModelPath] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isImportingModel, setIsImportingModel] = useState(false)

  const loadData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listenToStudioEvents(() => {
      void loadData()
    }, ["ai_models", "settings"]).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [loadData])

  const selectedModel = useMemo(
    () =>
      availableModels.find((model) => model.id === selectedModelId) || null,
    [availableModels, selectedModelId]
  )

  const selectModel = (modelId: string) => {
    const nextModel =
      availableModels.find((model) => model.id === modelId) || null
    setSelectedModelId(modelId)
    setModelPath(nextModel?.modelPath || "")
  }

  const saveModelSelection = async (modelId = selectedModelId) => {
    const nextModel =
      availableModels.find((model) => model.id === modelId) || null
    setSelectedModelId(modelId)
    setModelPath(nextModel?.modelPath || "")
    await services.getSettingsService().update("selectedModelId", modelId || "")
    await services
      .getSettingsService()
      .update("modelPath", nextModel?.modelPath || "")
  }

  return {
    availableModels,
    systemModels: SYSTEM_MODELS,
    selectedModel,
    selectedModelId,
    modelPath,
    isLoading,
    isImportingModel,
    selectModel,
    saveModelSelection,
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
      const nextModel = await services.getAIModelService().setActive(modelId)
      setAvailableModels((current) =>
        current.map((model) => ({
          ...model,
          isActive: model.id === nextModel.id,
          lastUsed: model.id === nextModel.id ? nextModel.lastUsed : model.lastUsed,
        }))
      )
      setSelectedModelId(nextModel.id)
      setModelPath(nextModel.modelPath || "")
      await saveModelSelection(nextModel.id)
      return nextModel
    },
    importModel: async (
      payload: Omit<ModelImportPayload, "type"> & { category: string }
    ) => {
      setIsImportingModel(true)
      try {
        const importedModel = await services.getAIModelService().importModel({
          ...payload,
          type: getModelType(payload.category),
        })

        setAvailableModels((current) => [importedModel, ...current])
        return importedModel
      } finally {
        setIsImportingModel(false)
      }
    },
    refreshModels: loadData,
    getModelType,
  }
}

export type AIModelViewModel = ReturnType<typeof useAIModelViewModel>
export type { SystemModel }

