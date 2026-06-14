import { useCallback, useEffect, useMemo, useState } from "react"
import { AIModel, ModelImportPayload } from "@/types/core"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"
import { SYSTEM_MODELS } from "@/lib/system-model-catalog"
import { isModelPredictionReady } from "@/lib/ai-model-metadata"
import type { SystemModel as BaseSystemModel } from "@/lib/schemas/ai-model"
import type {
  GitHubRelease,
  GitHubReleaseSource,
} from "@/lib/github-releases"
import {
  extractAssetFileName,
  githubReleaseSourceKey,
  normalizeReleaseTag,
} from "@/lib/github-releases"

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

function isRecommendedFamilyModel(model: AIModel) {
  return (
    normalizeValue(model.family) === "yolo26" &&
    normalizeValue(model.category) === "detection"
  )
}

function getDefaultRank(model: AIModel) {
  return typeof model.defaultRank === "number"
    ? model.defaultRank
    : Number.MAX_SAFE_INTEGER
}

function getRecommendedInstalledModel(models: AIModel[]) {
  const preferred = models.filter(isRecommendedFamilyModel).sort((left, right) => {
    if (isModelPredictionReady(left) && !isModelPredictionReady(right)) {
      return -1
    }
    if (!isModelPredictionReady(left) && isModelPredictionReady(right)) {
      return 1
    }
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

function getCatalogVersion(downloadUrl: string) {
  const match = downloadUrl.match(/\/download\/v?(\d+\.\d+(?:\.\d+)?)/i)
  if (match?.[1]) {
    return match[1]
  }

  if (downloadUrl.includes("/yolo26-onnx/")) {
    return "8.4.0"
  }

  return "1.0.0"
}

function getDefaultCatalogRelease(releases: GitHubRelease[]) {
  return (
    releases.find((release) => !release.draft && !release.prerelease) ||
    releases.find((release) => !release.draft) ||
    releases[0] ||
    null
  )
}

function buildCatalogVariantKey(model: BaseSystemModel, variant: SystemModelVariant) {
  return `${model.id}:${variant.slug || variant.modelVersion || variant.name}`
}

function releaseOptionLabel(release: GitHubRelease) {
  const base = release.name || release.tagName
  return release.prerelease ? `${base} (Pre-release)` : base
}

function buildReleaseUnavailableReason(assetName: string, tagName: string) {
  return `${assetName} is not published in GitHub release ${tagName}.`
}

export type SystemModel = BaseSystemModel
export type SystemModelVariant = NonNullable<SystemModel["variants"]>[number]

export interface CatalogReleaseOption {
  tagName: string
  label: string
  prerelease: boolean
  publishedAt?: string | null
}

export interface CatalogSystemModelVariant extends SystemModelVariant {
  assetName: string
  resolvedDownloadUrl: string
  resolvedVersion: string
  releaseTag?: string
  available: boolean
  unavailableReason?: string | null
}

export interface CatalogSystemModel extends SystemModel {
  selectedReleaseTag?: string
  releaseOptions?: CatalogReleaseOption[]
  isReleaseLoading?: boolean
  releaseError?: string | null
  variants?: CatalogSystemModelVariant[]
}

function getRecommendedSystemModel(models: CatalogSystemModel[]) {
  return (
    models.find((model) => model.recommended) ||
    models.find((model) => normalizeValue(model.family) === "yolo26") ||
    models[0] ||
    null
  )
}

function resolveCatalogVariant(
  variant: SystemModelVariant,
  selectedRelease: GitHubRelease | null
): CatalogSystemModelVariant {
  const assetName =
    variant.assetName || extractAssetFileName(variant.downloadUrl) || ""
  const fallbackVersion = getCatalogVersion(variant.downloadUrl)

  if (!selectedRelease) {
    return {
      ...variant,
      assetName,
      resolvedDownloadUrl: variant.downloadUrl,
      resolvedVersion: fallbackVersion,
      available: true,
      unavailableReason: null,
    }
  }

  const matchingAsset = assetName
    ? selectedRelease.assets.find(
        (asset) => normalizeValue(asset.name) === normalizeValue(assetName)
      )
    : null

  if (!matchingAsset) {
    return {
      ...variant,
      assetName,
      resolvedDownloadUrl: variant.downloadUrl,
      resolvedVersion: normalizeReleaseTag(selectedRelease.tagName),
      releaseTag: selectedRelease.tagName,
      available: false,
      unavailableReason: assetName
        ? buildReleaseUnavailableReason(assetName, selectedRelease.tagName)
        : "This catalog entry does not define a GitHub asset name.",
    }
  }

  return {
    ...variant,
    assetName,
    size: matchingAsset.size || variant.size,
    resolvedDownloadUrl: matchingAsset.browserDownloadUrl,
    resolvedVersion: normalizeReleaseTag(selectedRelease.tagName),
    releaseTag: selectedRelease.tagName,
    available: true,
    unavailableReason: null,
  }
}

/**
 * Resolves a model's hardcoded catalog variants against no specific release and
 * keeps only the ONNX assets. Used as the fallback when a model has no GitHub
 * release source, or when its releases have not been fetched yet.
 */
function resolveOnnxCatalogVariants(
  model: SystemModel
): CatalogSystemModelVariant[] | undefined {
  return model.variants
    ?.map((variant) => resolveCatalogVariant(variant, null))
    .filter((variant) => variant.assetName.toLowerCase().endsWith(".onnx"))
}

export const useAIModelViewModel = () => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [modelPath, setModelPath] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isImportingModel, setIsImportingModel] = useState(false)
  const [installingCatalogVariantKey, setInstallingCatalogVariantKey] = useState("")
  const [catalogReleasesBySource, setCatalogReleasesBySource] = useState<
    Record<string, GitHubRelease[]>
  >({})
  const [catalogReleaseSelectionBySource, setCatalogReleaseSelectionBySource] =
    useState<Record<string, string>>({})
  const [catalogReleaseLoadingBySource, setCatalogReleaseLoadingBySource] =
    useState<Record<string, boolean>>({})
  const [catalogReleaseErrorBySource, setCatalogReleaseErrorBySource] = useState<
    Record<string, string | null>
  >({})

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
      const activeModel = models.find((model) => model.isActive) || null
      const resolvedModel = savedModel || recommendedInstalledModel || activeModel
      const resolvedModelId = resolvedModel?.id || ""

      setAvailableModels(models)
      setSelectedModelId(resolvedModelId)
      setModelPath(resolvedModel?.modelPath || modelPathSetting.value || "")

      if ((!savedModelId || !savedModel) && recommendedInstalledModel) {
        await services
          .getSettingsService()
          .update("selectedModelId", recommendedInstalledModel.id)
        await services
          .getSettingsService()
          .update("modelPath", recommendedInstalledModel.modelPath || "")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadCatalogReleases = useCallback(
    async (source: GitHubReleaseSource) => {
      const sourceKey = githubReleaseSourceKey(source)
      setCatalogReleaseLoadingBySource((current) => ({
        ...current,
        [sourceKey]: true,
      }))
      setCatalogReleaseErrorBySource((current) => ({
        ...current,
        [sourceKey]: null,
      }))

      try {
        const releases = await services
          .getAIModelService()
          .listGitHubReleases(source.owner, source.repo)

        setCatalogReleasesBySource((current) => ({
          ...current,
          [sourceKey]: releases,
        }))
        setCatalogReleaseSelectionBySource((current) => {
          const defaultRelease = getDefaultCatalogRelease(releases)
          const currentSelection = current[sourceKey]
          const hasCurrentSelection = releases.some(
            (release) => release.tagName === currentSelection
          )

          if (hasCurrentSelection) {
            return current
          }

          return {
            ...current,
            [sourceKey]: defaultRelease?.tagName || "",
          }
        })
      } catch (error) {
        setCatalogReleaseErrorBySource((current) => ({
          ...current,
          [sourceKey]:
            error instanceof Error
              ? error.message
              : "Could not load GitHub releases for this model family.",
        }))
      } finally {
        setCatalogReleaseLoadingBySource((current) => ({
          ...current,
          [sourceKey]: false,
        }))
      }
    },
    []
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  // GitHub release catalogs are fetched on demand (per-family "refresh"), not on
  // mount — so the page never blocks on the network. Built-in catalog variants
  // render immediately.

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

  const systemModels = useMemo<CatalogSystemModel[]>(() => {
    return SYSTEM_MODELS.map((model) => {
      let resolvedVariants: CatalogSystemModelVariant[] | undefined

      if (!model.releaseSource) {
        resolvedVariants = resolveOnnxCatalogVariants(model)
      } else {
        const sourceKey = githubReleaseSourceKey(model.releaseSource)
        const releases = catalogReleasesBySource[sourceKey] || []
        const defaultRelease = getDefaultCatalogRelease(releases)
        const selectedReleaseTag =
          catalogReleaseSelectionBySource[sourceKey] || defaultRelease?.tagName
        const selectedRelease =
          releases.find((release) => release.tagName === selectedReleaseTag) ||
          defaultRelease ||
          null

        if (selectedRelease) {
          const onnxAssets = selectedRelease.assets.filter((a) =>
            a.name.toLowerCase().endsWith(".onnx")
          )

          resolvedVariants = onnxAssets.map((asset) => {
            const hardcodedVariant = model.variants?.find(
              (v) =>
                normalizeValue(
                  v.assetName || extractAssetFileName(v.downloadUrl) || ""
                ) === normalizeValue(asset.name)
            )

            if (hardcodedVariant) {
              return resolveCatalogVariant(hardcodedVariant, selectedRelease)
            }

            return {
              name: asset.name.replace(".onnx", ""),
              slug: asset.name.replace(".onnx", ""),
              assetName: asset.name,
              downloadUrl: asset.browserDownloadUrl,
              resolvedDownloadUrl: asset.browserDownloadUrl,
              resolvedVersion: normalizeReleaseTag(selectedRelease.tagName),
              releaseTag: selectedRelease.tagName,
              available: true,
              unavailableReason: null,
              size: asset.size,
              modelVersion: asset.name,
              variant: "",
              speed: "medium",
            } as CatalogSystemModelVariant
          })
        } else {
          resolvedVariants = resolveOnnxCatalogVariants(model)
        }

        return {
          ...model,
          selectedReleaseTag,
          releaseOptions: releases.map((release) => ({
            tagName: release.tagName,
            label: releaseOptionLabel(release),
            prerelease: release.prerelease,
            publishedAt: release.publishedAt,
          })),
          isReleaseLoading: catalogReleaseLoadingBySource[sourceKey] || false,
          releaseError: catalogReleaseErrorBySource[sourceKey] || null,
          variants: resolvedVariants,
        }
      }

      return {
        ...model,
        variants: resolvedVariants,
      }
    }).filter((model) => model.variants && model.variants.length > 0)
  }, [
    catalogReleaseErrorBySource,
    catalogReleaseLoadingBySource,
    catalogReleaseSelectionBySource,
    catalogReleasesBySource,
  ])

  const recommendedSystemModel = useMemo(
    () => getRecommendedSystemModel(systemModels),
    [systemModels]
  )

  // ── Derived state (kept out of the view for MVVM) ──────────────────────────
  const totalModelSize = useMemo(
    () => availableModels.reduce((sum, model) => sum + (model.modelSize || 0), 0),
    [availableModels]
  )

  const findInstalledCatalogVariant = useCallback(
    (model: CatalogSystemModel, variant: CatalogSystemModelVariant) => {
      const expectedVersion = normalizeValue(variant.resolvedVersion)
      const expectedModelVersion = normalizeValue(variant.modelVersion)
      const expectedCategory = normalizeValue(model.category)
      const expectedFamily = normalizeValue(model.family)
      const expectedVariant = normalizeValue(variant.variant)

      return (
        availableModels.find((entry) => {
          const matchesIdentity =
            normalizeValue(entry.category) === expectedCategory &&
            normalizeValue(entry.family) === expectedFamily &&
            normalizeValue(entry.variant) === expectedVariant
          if (!matchesIdentity) return false
          if (expectedVersion) {
            return normalizeValue(entry.version) === expectedVersion
          }
          return (
            !expectedModelVersion ||
            normalizeValue(entry.modelVersion || entry.model_version) ===
              expectedModelVersion
          )
        }) || null
      )
    },
    [availableModels]
  )

  const isInstallingVariant = useCallback(
    (model: CatalogSystemModel, variant: CatalogSystemModelVariant) =>
      installingCatalogVariantKey === buildCatalogVariantKey(model, variant),
    [installingCatalogVariantKey]
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

  const selectCatalogRelease = (model: SystemModel, tagName: string) => {
    if (!model.releaseSource) return

    const sourceKey = githubReleaseSourceKey(model.releaseSource)
    setCatalogReleaseSelectionBySource((current) => ({
      ...current,
      [sourceKey]: tagName,
    }))
  }

  return {
    availableModels,
    systemModels,
    selectedModel,
    selectedModelId,
    recommendedInstalledModel,
    recommendedSystemModel,
    totalModelSize,
    findInstalledCatalogVariant,
    isInstallingVariant,
    modelPath,
    isLoading,
    isImportingModel,
    installingCatalogVariantKey,
    selectModel,
    selectCatalogRelease,
    refreshCatalogReleases: async (model: SystemModel) => {
      if (!model.releaseSource) return
      await loadCatalogReleases(model.releaseSource)
    },
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
          lastUsed:
            model.id === nextModel.id ? nextModel.lastUsed : model.lastUsed,
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
    installSystemModel: async (
      model: CatalogSystemModel,
      variant: CatalogSystemModelVariant
    ) => {
      const variantKey = buildCatalogVariantKey(model, variant)
      setInstallingCatalogVariantKey(variantKey)

      try {
        if (!variant.available) {
          throw new Error(
            variant.unavailableReason ||
              "This asset is not available in the selected GitHub release."
          )
        }

        const taskType = model.taskType || getModelType(model.category)
        const downloadUrl = variant.resolvedDownloadUrl || variant.downloadUrl
        const installedModel = await services.getAIModelService().installModel({
          name: `${model.name} (${variant.name})`,
          description: model.description,
          version: variant.resolvedVersion || getCatalogVersion(downloadUrl),
          category: model.category,
          type: taskType,
          taskType,
          downloadUrl,
          fileName: variant.assetName || extractAssetFileName(downloadUrl) || undefined,
        })

        setAvailableModels((current) => {
          const next = current.filter((entry) => entry.id !== installedModel.id)
          return [installedModel, ...next]
        })

        return installedModel
      } finally {
        setInstallingCatalogVariantKey("")
      }
    },
    refreshModels: loadData,
    getModelType,
  }
}

export type AIModelViewModel = ReturnType<typeof useAIModelViewModel>
