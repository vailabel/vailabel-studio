import type { AiGpuInfo } from "@/shared/types/ai-assistant"

/**
 * Curated, hardware-tiered model bundles ("packs"). Instead of letting users
 * browse every catalog variant and GitHub release, we group models into three
 * performance tiers and install a whole bundle at once. Each pack aggregates a
 * detector (or several, at higher tiers) plus SAM for click-to-segment, so the
 * copilot has a multi-model set ready for auto-labeling across project
 * templates.
 *
 * `modelId` + `slug` reference entries in `SYSTEM_MODELS`
 * (`lib/system-model-catalog.ts`); only the built-in ONNX variants are used, so
 * no GitHub release fetching is involved.
 */
export type PackId = "lite" | "balanced" | "max"

export interface ModelPackItem {
  /** SYSTEM_MODELS catalog id. */
  modelId: string
  /** Catalog variant slug. */
  slug: string
  /** Human label shown in the pack contents list. */
  label: string
  /** The detector activated as the default after the pack installs. */
  primary?: boolean
}

export interface ModelPack {
  id: PackId
  name: string
  tagline: string
  blurb: string
  items: ModelPackItem[]
}

const SAM_ITEM: ModelPackItem = {
  modelId: "segment-anything-vit-b",
  slug: "sam-vit-b-quant",
  label: "SAM ViT-B · click-to-segment",
}

export const MODEL_PACKS: ModelPack[] = [
  {
    id: "lite",
    name: "Lite",
    tagline: "CPU-only & low-power laptops",
    blurb:
      "Smallest footprint. A fast nano detector plus SAM — enough to auto-label on any machine.",
    items: [
      {
        modelId: "yolo26-detection",
        slug: "yolo26n",
        label: "YOLO26 nano detector",
        primary: true,
      },
      SAM_ITEM,
    ],
  },
  {
    id: "balanced",
    name: "Balanced",
    tagline: "Modern GPU or 8+ core CPU",
    blurb:
      "Aggregates the nano, small and medium detectors with SAM for accurate multi-model auto-labels at good speed.",
    items: [
      {
        modelId: "yolo26-detection",
        slug: "yolo26n",
        label: "YOLO26 nano detector",
      },
      {
        modelId: "yolo26-detection",
        slug: "yolo26s",
        label: "YOLO26 small detector",
      },
      {
        modelId: "yolo26-detection",
        slug: "yolo26m",
        label: "YOLO26 medium detector",
        primary: true,
      },
      SAM_ITEM,
    ],
  },
  {
    id: "max",
    name: "Max accuracy",
    tagline: "Dedicated CUDA GPU",
    blurb:
      "The largest ensemble — small through xlarge detectors plus SAM — for the highest-recall auto-labeling.",
    items: [
      {
        modelId: "yolo26-detection",
        slug: "yolo26s",
        label: "YOLO26 small detector",
      },
      {
        modelId: "yolo26-detection",
        slug: "yolo26m",
        label: "YOLO26 medium detector",
      },
      {
        modelId: "yolo26-detection",
        slug: "yolo26l",
        label: "YOLO26 large detector",
      },
      {
        modelId: "yolo26-detection",
        slug: "yolo26x",
        label: "YOLO26 xlarge detector",
        primary: true,
      },
      SAM_ITEM,
    ],
  },
]

/**
 * Pick the pack that best matches the detected hardware. Coarse on purpose —
 * we only have GPU-acceleration availability and CPU core count to go on, not
 * VRAM, so we lean conservative and let the user override by installing another
 * tier.
 */
export function recommendTier(gpu: AiGpuInfo | null): PackId {
  if (!gpu) return "balanced"
  const cores = gpu.logicalCores ?? 0
  if (gpu.cudaAvailable || (gpu.gpuAccelerationAvailable && cores >= 12)) {
    return "max"
  }
  if (gpu.gpuAccelerationAvailable || cores >= 8) return "balanced"
  return "lite"
}

export const packName = (id: PackId) =>
  MODEL_PACKS.find((pack) => pack.id === id)?.name ?? id
