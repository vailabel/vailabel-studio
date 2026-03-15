import type { Annotation, Prediction } from "@/types/core"
import { studioCommands } from "@/ipc/studio"

export const predictionsService = {
  listByImageId: (imageId: string) =>
    studioCommands.predictionsListByImage(imageId),
  generate: (payload: {
    imageId: string
    modelId: string
    threshold?: number
  }) => studioCommands.predictionsGenerate(payload),
  accept: (predictionId: string) =>
    studioCommands.predictionsAccept(predictionId) as Promise<Annotation>,
  reject: (predictionId: string) =>
    studioCommands.predictionsReject(predictionId),
}

