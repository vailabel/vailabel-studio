import type {
  AIModel,
  Annotation,
  ImageData,
  LabelStudioPrediction,
  LabelStudioResult,
  LabelStudioTask,
  Prediction,
} from "@/types/core"

const LABEL_STUDIO_IMAGE_KEY = "image"
const LABEL_STUDIO_FROM_NAME = "label"
const LABEL_STUDIO_TO_NAME = "image"

type RegionLike = Pick<
  Prediction,
  | "id"
  | "name"
  | "type"
  | "coordinates"
  | "confidence"
  | "modelVersion"
  | "fromName"
  | "toName"
  | "resultType"
>

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value))
}

function getImageSource(image: ImageData) {
  return image.url || image.data || image.name
}

function toPercentX(value: number, image: ImageData) {
  return clampPercentage((value / Math.max(image.width, 1)) * 100)
}

function toPercentY(value: number, image: ImageData) {
  return clampPercentage((value / Math.max(image.height, 1)) * 100)
}

function fromPercentX(value: number, image: ImageData) {
  return (value / 100) * Math.max(image.width, 1)
}

function fromPercentY(value: number, image: ImageData) {
  return (value / 100) * Math.max(image.height, 1)
}

function createFallbackId(index: number) {
  return `ls-region-${index + 1}`
}

function getResultType(region: RegionLike) {
  if (region.resultType) return region.resultType
  return region.type === "polygon" || region.type === "freeDraw"
    ? "polygonlabels"
    : "rectanglelabels"
}

export function toLabelStudioResult(
  region: RegionLike,
  image: ImageData
): LabelStudioResult {
  const id = region.id || createFallbackId(0)
  const from_name = region.fromName || LABEL_STUDIO_FROM_NAME
  const to_name = region.toName || LABEL_STUDIO_TO_NAME
  const resultType = getResultType(region)

  if (resultType === "polygonlabels") {
    return {
      id,
      from_name,
      to_name,
      type: "polygonlabels",
      score: region.confidence,
      value: {
        points: region.coordinates.map((point) => [
          toPercentX(point.x, image),
          toPercentY(point.y, image),
        ]),
        polygonlabels: [region.name],
      },
    }
  }

  const [topLeft, bottomRight] = region.coordinates
  const safeTopLeft = topLeft || { x: 0, y: 0 }
  const safeBottomRight = bottomRight || safeTopLeft
  return {
    id,
    from_name,
    to_name,
    type: "rectanglelabels",
    score: region.confidence,
    value: {
      x: toPercentX(safeTopLeft.x, image),
      y: toPercentY(safeTopLeft.y, image),
      width: clampPercentage(
        toPercentX(Math.max(safeBottomRight.x - safeTopLeft.x, 0), image)
      ),
      height: clampPercentage(
        toPercentY(Math.max(safeBottomRight.y - safeTopLeft.y, 0), image)
      ),
      rotation: 0,
      rectanglelabels: [region.name],
    },
  }
}

export function createLabelStudioTask(args: {
  image: ImageData
  predictions: Prediction[]
  model?: AIModel | null
}): LabelStudioTask {
  const { image, predictions, model } = args
  const modelVersion =
    model?.modelVersion ||
    predictions[0]?.modelVersion ||
    model?.version ||
    "local-model"

  const result = predictions.map((prediction) =>
    toLabelStudioResult(prediction, image)
  )
  const averageScore =
    predictions.length > 0
      ? predictions.reduce(
          (sum, prediction) => sum + (prediction.confidence || 0),
          0
        ) / predictions.length
      : undefined

  return {
    data: {
      [LABEL_STUDIO_IMAGE_KEY]: getImageSource(image),
    },
    predictions: [
      {
        model_version: modelVersion,
        score: averageScore,
        result,
      },
    ],
  }
}

export function createLabelStudioTaskFromAnnotations(args: {
  image: ImageData
  annotations: Annotation[]
  modelVersion?: string
}): LabelStudioTask {
  const { image, annotations, modelVersion = "manual-review" } = args
  const predictionResults = annotations.map((annotation, index) =>
    toLabelStudioResult(
      {
        id: annotation.id || createFallbackId(index),
        name: annotation.name,
        type: annotation.type,
        coordinates: annotation.coordinates,
        confidence: 1,
      },
      image
    )
  )

  return {
    data: {
      [LABEL_STUDIO_IMAGE_KEY]: getImageSource(image),
    },
    predictions: [
      {
        model_version: modelVersion,
        result: predictionResults,
      },
    ],
  }
}

export function fromLabelStudioTask(args: {
  task: LabelStudioTask
  image: ImageData
  modelId?: string
  projectId?: string
}): Array<Partial<Prediction>> {
  const { task, image, modelId, projectId } = args

  return (task.predictions || []).flatMap((prediction, predictionIndex) =>
    (prediction.result || []).flatMap((result, resultIndex) => {
      if (result.type === "rectanglelabels") {
        const value = result.value as {
          x: number
          y: number
          width: number
          height: number
          rectanglelabels?: string[]
        }
        const label = value.rectanglelabels?.[0]
        if (!label) return []
        const topLeft = {
          x: fromPercentX(value.x, image),
          y: fromPercentY(value.y, image),
        }
        const bottomRight = {
          x: fromPercentX(value.x + value.width, image),
          y: fromPercentY(value.y + value.height, image),
        }

        return [
          {
            id:
              result.id ||
              `ls-import-${predictionIndex + 1}-${resultIndex + 1}`,
            name: label,
            type: "box",
            coordinates: [topLeft, bottomRight],
            confidence: result.score || prediction.score || 0,
            imageId: image.id,
            image_id: image.id,
            projectId,
            project_id: projectId,
            modelId,
            model_id: modelId,
            modelVersion: prediction.model_version,
            model_version: prediction.model_version,
            fromName: result.from_name,
            from_name: result.from_name,
            toName: result.to_name,
            to_name: result.to_name,
            resultType: result.type,
            result_type: result.type,
            isAIGenerated: true,
          },
        ]
      }

      if (result.type === "polygonlabels") {
        const value = result.value as {
          points: number[][]
          polygonlabels?: string[]
        }
        const label = value.polygonlabels?.[0]
        if (!label) return []

        return [
          {
            id:
              result.id ||
              `ls-import-${predictionIndex + 1}-${resultIndex + 1}`,
            name: label,
            type: "polygon",
            coordinates: (value.points || []).map(([x, y]) => ({
              x: fromPercentX(x, image),
              y: fromPercentY(y, image),
            })),
            confidence: result.score || prediction.score || 0,
            imageId: image.id,
            image_id: image.id,
            projectId,
            project_id: projectId,
            modelId,
            model_id: modelId,
            modelVersion: prediction.model_version,
            model_version: prediction.model_version,
            fromName: result.from_name,
            from_name: result.from_name,
            toName: result.to_name,
            to_name: result.to_name,
            resultType: result.type,
            result_type: result.type,
            isAIGenerated: true,
          },
        ]
      }

      return []
    })
  )
}

export {
  LABEL_STUDIO_FROM_NAME,
  LABEL_STUDIO_IMAGE_KEY,
  LABEL_STUDIO_TO_NAME,
}
