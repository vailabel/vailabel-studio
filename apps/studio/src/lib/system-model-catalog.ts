import type { SystemModel } from "@/lib/schemas/ai-model"

const COCO_80_CLASS_NAMES = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
]

const ULTRALYTICS_RELEASE_BASE_URL =
  "https://github.com/ultralytics/assets/releases/download"
const DEFAULT_ULTRALYTICS_RELEASE_TAG = "v8.4.0"

function ultralyticsReleaseUrl(
  fileName: string,
  releaseTag = DEFAULT_ULTRALYTICS_RELEASE_TAG
) {
  return `${ULTRALYTICS_RELEASE_BASE_URL}/${releaseTag}/${fileName}`
}

function buildCatalogMetadata(category: SystemModel["category"], downloadUrl: string) {
  const isOnnx = downloadUrl.toLowerCase().endsWith(".onnx")

  if (category !== "detection") {
    return {
      classCount: 0,
      labelSource: "catalog_reference",
      supportsPrediction: false,
      unsupportedReason:
        "AI detect currently supports object-detection models only. Segmentation, pose, and open-vocabulary variants are reference installs for now.",
    }
  }

  return {
    classNames: COCO_80_CLASS_NAMES,
    classCount: COCO_80_CLASS_NAMES.length,
    labelSource: "builtin_catalog",
    supportsPrediction: isOnnx,
    unsupportedReason: isOnnx
      ? null
      : "Catalog installs download PyTorch checkpoints first. The desktop app will try to convert them to ONNX for local AI detect when Ultralytics is available.",
  }
}

export const SYSTEM_MODELS: SystemModel[] = [
  {
    id: "yolo26-detection",
    name: "YOLO26 Detection",
    description:
      "Ultralytics YOLO26 end-to-end object detection family. Recommended as the default pre-annotation model for image projects.",
    category: "detection",
    family: "yolo26",
    releaseSource: {
      provider: "github",
      owner: "ultralytics",
      repo: "assets",
    },
    taskType: "object_detection",
    defaultRank: 0,
    supportsLabelStudioFormat: true,
    recommended: true,
    requirements: {
      minMemory: 2048,
      recommendedMemory: 4096,
      gpuRequired: false,
    },
    variants: [
      {
        name: "nano",
        slug: "yolo26n",
        assetName: "yolo26n.onnx",
        variant: "n",
        modelVersion: "YOLO26n",
        downloadUrl: ultralyticsReleaseUrl("yolo26n.onnx"),
        size: 2400000,
        accuracy: 40.9,
        speed: "fast",
        defaultRank: 0,
        recommended: true,
        modelMetadata: buildCatalogMetadata(
          "detection",
          ultralyticsReleaseUrl("yolo26n.onnx")
        ),
      },
      {
        name: "small",
        slug: "yolo26s",
        assetName: "yolo26s.onnx",
        variant: "s",
        modelVersion: "YOLO26s",
        downloadUrl: ultralyticsReleaseUrl("yolo26s.onnx"),
        size: 9500000,
        accuracy: 48.6,
        speed: "medium",
        defaultRank: 10,
        modelMetadata: buildCatalogMetadata(
          "detection",
          ultralyticsReleaseUrl("yolo26s.onnx")
        ),
      },
      {
        name: "medium",
        slug: "yolo26m",
        assetName: "yolo26m.onnx",
        variant: "m",
        modelVersion: "YOLO26m",
        downloadUrl: ultralyticsReleaseUrl("yolo26m.onnx"),
        size: 20400000,
        accuracy: 53.1,
        speed: "medium",
        defaultRank: 20,
        modelMetadata: buildCatalogMetadata(
          "detection",
          ultralyticsReleaseUrl("yolo26m.onnx")
        ),
      },
      {
        name: "large",
        slug: "yolo26l",
        assetName: "yolo26l.onnx",
        variant: "l",
        modelVersion: "YOLO26l",
        downloadUrl: ultralyticsReleaseUrl("yolo26l.onnx"),
        size: 24800000,
        accuracy: 55.0,
        speed: "slow",
        defaultRank: 30,
        modelMetadata: buildCatalogMetadata(
          "detection",
          ultralyticsReleaseUrl("yolo26l.onnx")
        ),
      },
      {
        name: "xlarge",
        slug: "yolo26x",
        assetName: "yolo26x.onnx",
        variant: "x",
        modelVersion: "YOLO26x",
        downloadUrl: ultralyticsReleaseUrl("yolo26x.onnx"),
        size: 55700000,
        accuracy: 57.5,
        speed: "slow",
        defaultRank: 40,
        modelMetadata: buildCatalogMetadata(
          "detection",
          ultralyticsReleaseUrl("yolo26x.onnx")
        ),
      },
    ],
  },
  {
    id: "yolo26-segmentation",
    name: "YOLO26 Segmentation",
    description:
      "Mask-capable YOLO26 models for region proposals and polygon-style review workflows.",
    category: "segmentation",
    family: "yolo26",
    releaseSource: {
      provider: "github",
      owner: "ultralytics",
      repo: "assets",
    },
    taskType: "segmentation",
    defaultRank: 50,
    supportsLabelStudioFormat: true,
    requirements: {
      minMemory: 3072,
      recommendedMemory: 6144,
      gpuRequired: false,
    },
    variants: [
      {
        name: "nano",
        slug: "yolo26n-seg",
        assetName: "yolo26n-seg.pt",
        variant: "n",
        modelVersion: "YOLO26n-seg",
        downloadUrl: ultralyticsReleaseUrl("yolo26n-seg.pt"),
        speed: "fast",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          ultralyticsReleaseUrl("yolo26n-seg.pt")
        ),
      },
      {
        name: "small",
        slug: "yolo26s-seg",
        assetName: "yolo26s-seg.pt",
        variant: "s",
        modelVersion: "YOLO26s-seg",
        downloadUrl: ultralyticsReleaseUrl("yolo26s-seg.pt"),
        speed: "medium",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          ultralyticsReleaseUrl("yolo26s-seg.pt")
        ),
      },
    ],
  },
  {
    id: "yolo26-pose",
    name: "YOLO26 Pose",
    description:
      "Pose-estimation variants for keypoint-heavy annotation review and human pose projects.",
    category: "pose",
    family: "yolo26",
    releaseSource: {
      provider: "github",
      owner: "ultralytics",
      repo: "assets",
    },
    taskType: "pose_estimation",
    defaultRank: 60,
    supportsLabelStudioFormat: true,
    requirements: {
      minMemory: 3072,
      recommendedMemory: 6144,
      gpuRequired: false,
    },
    variants: [
      {
        name: "nano",
        slug: "yolo26n-pose",
        assetName: "yolo26n-pose.pt",
        variant: "n",
        modelVersion: "YOLO26n-pose",
        downloadUrl: ultralyticsReleaseUrl("yolo26n-pose.pt"),
        speed: "fast",
        modelMetadata: buildCatalogMetadata(
          "pose",
          ultralyticsReleaseUrl("yolo26n-pose.pt")
        ),
      },
      {
        name: "small",
        slug: "yolo26s-pose",
        assetName: "yolo26s-pose.pt",
        variant: "s",
        modelVersion: "YOLO26s-pose",
        downloadUrl: ultralyticsReleaseUrl("yolo26s-pose.pt"),
        speed: "medium",
        modelMetadata: buildCatalogMetadata(
          "pose",
          ultralyticsReleaseUrl("yolo26s-pose.pt")
        ),
      },
    ],
  },
  {
    id: "yoloe-26-open-vocab",
    name: "YOLOE-26 Open Vocabulary",
    description:
      "Advanced open-vocabulary segmentation family with text and visual prompting. Best for exploratory workflows, not the default offline detector.",
    category: "segmentation",
    family: "yoloe-26",
    releaseSource: {
      provider: "github",
      owner: "ultralytics",
      repo: "assets",
    },
    taskType: "open_vocabulary_segmentation",
    defaultRank: 100,
    supportsLabelStudioFormat: true,
    requirements: {
      minMemory: 6144,
      recommendedMemory: 8192,
      gpuRequired: true,
      cudaVersion: "12+",
    },
    variants: [
      {
        name: "nano",
        slug: "yoloe-26n-seg",
        assetName: "yoloe-26n-seg.pt",
        variant: "n",
        modelVersion: "YOLOE-26n-seg",
        downloadUrl: ultralyticsReleaseUrl("yoloe-26n-seg.pt"),
        speed: "fast",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          ultralyticsReleaseUrl("yoloe-26n-seg.pt")
        ),
      },
      {
        name: "small",
        slug: "yoloe-26s-seg",
        assetName: "yoloe-26s-seg.pt",
        variant: "s",
        modelVersion: "YOLOE-26s-seg",
        downloadUrl: ultralyticsReleaseUrl("yoloe-26s-seg.pt"),
        speed: "medium",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          ultralyticsReleaseUrl("yoloe-26s-seg.pt")
        ),
      },
    ],
  },
]
