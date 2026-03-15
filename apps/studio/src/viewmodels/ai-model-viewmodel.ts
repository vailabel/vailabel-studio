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

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() || ""
}

function isRecommendedInstalledModel(model: AIModel) {
  return (
    normalizeValue(model.family) === "yolo26" &&
    normalizeValue(model.category) === "detection" &&
    normalizeValue(model.variant) === "n"
  )
}

function getDefaultRank(model: AIModel) {
  return typeof model.defaultRank === "number" ? model.defaultRank : Number.MAX_SAFE_INTEGER
}

function getRecommendedInstalledModel(models: AIModel[]) {
  const preferred = [...models].sort((left, right) => {
    if (isRecommendedInstalledModel(left) && !isRecommendedInstalledModel(right)) {
      return -1
    }
    if (!isRecommendedInstalledModel(left) && isRecommendedInstalledModel(right)) {
      return 1
    }
    if (left.isActive && !right.isActive) return -1
    if (!left.isActive && right.isActive) return 1
    return getDefaultRank(left) - getDefaultRank(right)
  })

  return preferred[0] || null
}

function getRecommendedSystemModel(models: SystemModel[]) {
  return (
    models.find((model) => model.recommended) ||
    models.find((model) => normalizeValue(model.family) === "yolo26") ||
    models[0] ||
    null
  )
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
      const savedModelId = selectedModelSetting.value || ""
      const recommendedInstalledModel = getRecommendedInstalledModel(models)
      const savedModel = models.find((model) => model.id === savedModelId) || null
      const resolvedModel = savedModel || recommendedInstalledModel
      const resolvedModelId = resolvedModel?.id || ""

      setAvailableModels(models)
      setSelectedModelId(resolvedModelId)
      setModelPath(resolvedModel?.modelPath || modelPathSetting.value || "")

      if ((!savedModelId || !savedModel) && recommendedInstalledModel) {
        await services.getSettingsService().update("selectedModelId", recommendedInstalledModel.id)
        await services
          .getSettingsService()
          .update("modelPath", recommendedInstalledModel.modelPath || "")
      }
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

  const recommendedInstalledModel = useMemo(
    () => getRecommendedInstalledModel(availableModels),
    [availableModels]
  )

  const recommendedSystemModel = useMemo(
    () => getRecommendedSystemModel(SYSTEM_MODELS),
    []
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
    recommendedInstalledModel,
    recommendedSystemModel,
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

