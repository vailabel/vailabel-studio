import {
  createLabelStudioTask,
  createLabelStudioTaskFromAnnotations,
  fromLabelStudioTask,
} from "@/lib/label-studio-adapter"
import type {
  AIModel,
  Annotation,
  ImageData,
  LabelStudioTask,
  Prediction,
} from "@/types/core"
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
  exportToLabelStudioTask: (args: {
    image: ImageData
    predictions: Prediction[]
    model?: AIModel | null
  }): LabelStudioTask => createLabelStudioTask(args),
  exportAnnotationsToLabelStudioTask: (args: {
    image: ImageData
    annotations: Annotation[]
    modelVersion?: string
  }): LabelStudioTask => createLabelStudioTaskFromAnnotations(args),
  importFromLabelStudioTask: (args: {
    task: LabelStudioTask
    image: ImageData
    modelId?: string
    projectId?: string
  }) => fromLabelStudioTask(args),
}

