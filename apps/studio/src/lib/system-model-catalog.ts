import type { SystemModel } from "@/lib/schemas/ai-model"

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
      },
      {
        name: "small",
        slug: "yolo26s-seg",
        variant: "s",
        modelVersion: "YOLO26s-seg",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-seg.pt",
        speed: "medium",
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
      },
      {
        name: "small",
        slug: "yolo26s-pose",
        variant: "s",
        modelVersion: "YOLO26s-pose",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-pose.pt",
        speed: "medium",
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
      },
      {
        name: "small",
        slug: "yoloe-26s-seg",
        variant: "s",
        modelVersion: "YOLOE-26s-seg",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.4.0/yoloe-26s-seg.pt",
        speed: "medium",
      },
    ],
  },
]
