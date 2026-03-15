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
      : "Catalog installs currently download PyTorch checkpoints. Import an ONNX export to run local AI detect.",
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
        variant: "n",
        modelVersion: "YOLO26n",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n.pt",
        size: 2400000,
        accuracy: 40.9,
        speed: "fast",
        defaultRank: 0,
        recommended: true,
        modelMetadata: buildCatalogMetadata(
          "detection",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n.pt"
        ),
      },
      {
        name: "small",
        slug: "yolo26s",
        variant: "s",
        modelVersion: "YOLO26s",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s.pt",
        size: 9500000,
        accuracy: 48.6,
        speed: "medium",
        defaultRank: 10,
        modelMetadata: buildCatalogMetadata(
          "detection",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s.pt"
        ),
      },
      {
        name: "medium",
        slug: "yolo26m",
        variant: "m",
        modelVersion: "YOLO26m",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26m.pt",
        size: 20400000,
        accuracy: 53.1,
        speed: "medium",
        defaultRank: 20,
        modelMetadata: buildCatalogMetadata(
          "detection",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26m.pt"
        ),
      },
      {
        name: "large",
        slug: "yolo26l",
        variant: "l",
        modelVersion: "YOLO26l",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26l.pt",
        size: 24800000,
        accuracy: 55.0,
        speed: "slow",
        defaultRank: 30,
        modelMetadata: buildCatalogMetadata(
          "detection",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26l.pt"
        ),
      },
      {
        name: "xlarge",
        slug: "yolo26x",
        variant: "x",
        modelVersion: "YOLO26x",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26x.pt",
        size: 55700000,
        accuracy: 57.5,
        speed: "slow",
        defaultRank: 40,
        modelMetadata: buildCatalogMetadata(
          "detection",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26x.pt"
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
        variant: "n",
        modelVersion: "YOLO26n-seg",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n-seg.pt",
        speed: "fast",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n-seg.pt"
        ),
      },
      {
        name: "small",
        slug: "yolo26s-seg",
        variant: "s",
        modelVersion: "YOLO26s-seg",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-seg.pt",
        speed: "medium",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-seg.pt"
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
        variant: "n",
        modelVersion: "YOLO26n-pose",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n-pose.pt",
        speed: "fast",
        modelMetadata: buildCatalogMetadata(
          "pose",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n-pose.pt"
        ),
      },
      {
        name: "small",
        slug: "yolo26s-pose",
        variant: "s",
        modelVersion: "YOLO26s-pose",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-pose.pt",
        speed: "medium",
        modelMetadata: buildCatalogMetadata(
          "pose",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-pose.pt"
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
        variant: "n",
        modelVersion: "YOLOE-26n-seg",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yoloe-26n-seg.pt",
        speed: "fast",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yoloe-26n-seg.pt"
        ),
      },
      {
        name: "small",
        slug: "yoloe-26s-seg",
        variant: "s",
        modelVersion: "YOLOE-26s-seg",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yoloe-26s-seg.pt",
        speed: "medium",
        modelMetadata: buildCatalogMetadata(
          "segmentation",
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yoloe-26s-seg.pt"
        ),
      },
    ],
  },
]
