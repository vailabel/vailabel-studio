import {
  createLabelStudioTask,
  createLabelStudioTaskFromAnnotations,
  fromLabelStudioTask,
} from "@/shared/lib/label-studio-adapter"
import type {
  AIModel,
  Annotation,
  Item,
  LabelStudioTask,
  Prediction,
} from "@/shared/types/core"
import { studioCommands, type PipelineRunRequest } from "@/shared/ipc/studio"

export const predictionsService = {
  listByItemId: (itemId: string) =>
    studioCommands.predictionsListByItem(itemId),
  generate: (payload: {
    itemId: string
    modelId: string
    threshold?: number
  }) => studioCommands.predictionsGenerate(payload),
  /** Prompt-driven inference (SAM click/box-to-segment). Returns the polygon
   *  predictions produced for this prompt, persisted for the review loop. */
  pipelineRun: (payload: PipelineRunRequest) =>
    studioCommands.pipelineRun(payload),
  accept: (predictionId: string, labelId?: string) =>
    studioCommands.predictionsAccept(predictionId, labelId) as Promise<Annotation>,
  reject: (predictionId: string) =>
    studioCommands.predictionsReject(predictionId),
  exportToLabelStudioTask: (args: {
    image: Item
    predictions: Prediction[]
    model?: AIModel | null
  }): LabelStudioTask => createLabelStudioTask(args),
  exportAnnotationsToLabelStudioTask: (args: {
    image: Item
    annotations: Annotation[]
    modelVersion?: string
  }): LabelStudioTask => createLabelStudioTaskFromAnnotations(args),
  importFromLabelStudioTask: (args: {
    task: LabelStudioTask
    image: Item
    modelId?: string
    projectId?: string
  }) => fromLabelStudioTask(args),
}

