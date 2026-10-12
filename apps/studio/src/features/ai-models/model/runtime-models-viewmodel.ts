import { useResource } from "@/shared/hooks/use-resource"
import { toErrorMessage } from "@/shared/lib/errors"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import type { RuntimeModel } from "@/shared/types/ai-runtime"

const NO_MODELS: RuntimeModel[] = []
const loadModels = () => aiRuntimeService.listModels()

/**
 * Lists the embedded Python runtime's model catalog (RT-DETR, SAM2, Florence-2,
 * PaddleOCR, …). Weights are fetched by the runtime on first use, so this is a
 * read-only view of what's available + what's already resident — there is no
 * Rust-side download step anymore.
 */
export function useRuntimeModelsViewModel() {
  const { data, isLoading, error, reload } = useResource(loadModels, {
    initialData: NO_MODELS,
  })

  return {
    models: data,
    isLoading,
    error: error
      ? toErrorMessage(error, "Could not load the model catalog.")
      : null,
    refresh: reload,
  }
}
