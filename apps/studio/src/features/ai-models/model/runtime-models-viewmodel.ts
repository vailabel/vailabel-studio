import { useCallback, useEffect, useState } from "react"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import type { RuntimeModel } from "@/shared/types/ai-runtime"

/**
 * Lists the embedded Python runtime's model catalog (RT-DETR, SAM2, Florence-2,
 * PaddleOCR, …). Weights are fetched by the runtime on first use, so this is a
 * read-only view of what's available + what's already resident — there is no
 * Rust-side download step anymore.
 */
export function useRuntimeModelsViewModel() {
  const [models, setModels] = useState<RuntimeModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setModels(await aiRuntimeService.listModels())
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load the model catalog."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { models, isLoading, error, refresh: load }
}
