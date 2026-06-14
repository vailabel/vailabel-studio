import { useCallback, useEffect, useMemo, useState } from "react"
import { aiAssistantService } from "@/services/ai-assistant-service"
import type {
  AiCapability,
  AiGpuInfo,
  AiRegistryModel,
} from "@/types/ai-assistant"

export interface CapabilityAvailability {
  capability: AiCapability
  /** True when at least one registered model with this capability is wired. */
  available: boolean
  /** Models that provide this capability. */
  models: AiRegistryModel[]
}

const ALL_CAPABILITIES: AiCapability[] = [
  "click_to_segment",
  "prompt_to_detect",
  "auto_polygon",
  "auto_bounding_box",
  "batch_auto_labeling",
]

/**
 * Loads the local AI assistant's GPU/runtime info and the model registry, and
 * derives which of the Phase 1 capabilities are actually available (a capability
 * is "available" only if a model providing it has a wired engine).
 */
export function useAiAssistantViewModel() {
  const [gpu, setGpu] = useState<AiGpuInfo | null>(null)
  const [models, setModels] = useState<AiRegistryModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [gpuInfo, registry] = await Promise.all([
        aiAssistantService.getGpuInfo(),
        aiAssistantService.getModelRegistry(),
      ])
      setGpu(gpuInfo)
      setModels(registry)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const capabilities = useMemo<CapabilityAvailability[]>(
    () =>
      ALL_CAPABILITIES.map((capability) => {
        const providers = models.filter((model) =>
          model.capabilities.includes(capability)
        )
        return {
          capability,
          available: providers.some((model) => model.status === "available"),
          models: providers,
        }
      }),
    [models]
  )

  return { gpu, models, capabilities, isLoading, error, reload: load }
}
