import type { SystemModel } from "@/lib/schemas/ai-model"

export const SYSTEM_MODELS: SystemModel[] = [
  {
    id: "yolo11-detection",
    name: "YOLO11 Detection",
    description:
      "Ultralytics object detection models for general-purpose local inference.",
    category: "detection",
    requirements: {
      minMemory: 2048,
      recommendedMemory: 4096,
      gpuRequired: false,
    },
    variants: [
      {
        name: "nano",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt",
        size: 5600000,
        accuracy: 39.5,
        speed: "fast",
      },
      {
        name: "small",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11s.pt",
        size: 19800000,
        accuracy: 47.0,
        speed: "medium",
      },
      {
        name: "medium",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11m.pt",
        size: 41000000,
        accuracy: 51.5,
        speed: "slow",
      },
    ],
  },
  {
    id: "yolo11-segmentation",
    name: "YOLO11 Segmentation",
    description:
      "Ultralytics segmentation models for masks and region-aware annotations.",
    category: "segmentation",
    requirements: {
      minMemory: 3072,
      recommendedMemory: 6144,
      gpuRequired: false,
    },
    variants: [
      {
        name: "nano",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n-seg.pt",
        size: 9700000,
        accuracy: 38.9,
        speed: "fast",
      },
      {
        name: "small",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11s-seg.pt",
        size: 23600000,
        accuracy: 46.6,
        speed: "medium",
      },
    ],
  },
  {
    id: "yolo11-pose",
    name: "YOLO11 Pose",
    description:
      "Ultralytics pose-estimation models for keypoints and human pose workflows.",
    category: "pose",
    requirements: {
      minMemory: 3072,
      recommendedMemory: 6144,
      gpuRequired: false,
    },
    variants: [
      {
        name: "nano",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n-pose.pt",
        size: 7600000,
        accuracy: 50.0,
        speed: "fast",
      },
      {
        name: "small",
        downloadUrl:
          "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11s-pose.pt",
        size: 25700000,
        accuracy: 58.9,
        speed: "medium",
      },
    ],
  },
]
