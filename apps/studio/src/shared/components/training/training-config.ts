import type { CSSProperties } from "react"

/**
 * Shared training configuration: model families, duration presets, and
 * Roboflow-style augmentation — plus the helpers that turn an augmentation into
 * a live CSS preview. Used by both the quick training dialog and the full
 * training page so they never drift.
 */

export const FAMILIES = [
  { value: "yolo", label: "YOLO (detection)" },
  { value: "rtdetr", label: "RT-DETR (detection)" },
] as const

/** Plain-language duration presets so non-experts don't guess epochs/image-size. */
export const PRESETS = {
  fast: {
    label: "Fast",
    epochs: 40,
    imgsz: 512,
    hint: "Quick first pass — good for testing the loop on a few images.",
  },
  balanced: {
    label: "Balanced",
    epochs: 100,
    imgsz: 640,
    hint: "Sensible default for most datasets.",
  },
  accurate: {
    label: "Accurate",
    epochs: 200,
    imgsz: 960,
    hint: "Best quality, but the slowest to train.",
  },
  custom: {
    label: "Custom",
    epochs: 100,
    imgsz: 640,
    hint: "Set epochs and image size yourself.",
  },
} as const

export type PresetKey = keyof typeof PRESETS

/**
 * Roboflow-style data augmentation, expressed as ultralytics training
 * hyperparameters. ultralytics applies these on the fly per batch during
 * training (no pre-generated images on disk), so it's the efficient equivalent
 * of generating an augmented dataset version. Forwarded verbatim into the
 * training `config` → `model.train(**config)`.
 */
export interface Augmentation {
  fliplr: number // horizontal flip probability (0 | 0.5)
  flipud: number // vertical flip probability (0 | 0.5)
  degrees: number // ± rotation degrees
  scale: number // random zoom (gain)
  translate: number // random shift
  hsv_h: number // hue
  hsv_s: number // saturation
  hsv_v: number // brightness (value)
  mosaic: number // 4-image mosaic probability
  mixup: number // image blend probability
}

export const AUG_PRESETS = {
  none: {
    label: "None",
    hint: "Train on the raw labeled images — no augmentation.",
    values: {
      fliplr: 0, flipud: 0, degrees: 0, scale: 0, translate: 0,
      hsv_h: 0, hsv_s: 0, hsv_v: 0, mosaic: 0, mixup: 0,
    },
  },
  light: {
    label: "Light",
    hint: "Gentle flips + color shifts — safe for almost any dataset.",
    values: {
      fliplr: 0.5, flipud: 0, degrees: 0, scale: 0.3, translate: 0.1,
      hsv_h: 0.015, hsv_s: 0.4, hsv_v: 0.3, mosaic: 0.5, mixup: 0,
    },
  },
  standard: {
    label: "Standard (recommended)",
    hint: "Ultralytics' well-tested defaults — strong, general-purpose.",
    values: {
      fliplr: 0.5, flipud: 0, degrees: 0, scale: 0.5, translate: 0.1,
      hsv_h: 0.015, hsv_s: 0.7, hsv_v: 0.4, mosaic: 1, mixup: 0,
    },
  },
  heavy: {
    label: "Heavy",
    hint: "Aggressive variety for small datasets — train for more epochs.",
    values: {
      fliplr: 0.5, flipud: 0.2, degrees: 10, scale: 0.6, translate: 0.2,
      hsv_h: 0.02, hsv_s: 0.8, hsv_v: 0.5, mosaic: 1, mixup: 0.15,
    },
  },
} satisfies Record<string, { label: string; hint: string; values: Augmentation }>

export type AugKey = keyof typeof AUG_PRESETS

export const pctText = (v: number) => `${Math.round(v * 100)}%`

/** Stable random factors for one preview variant. The factors are fixed when
 *  the variant is created; the actual magnitude is derived from the *current*
 *  augmentation at render time, so dragging a slider updates the preview
 *  smoothly instead of re-rolling it. "Shuffle" makes new seeds. */
export interface AugSeed {
  fx: number // [-1,1] → horizontal flip when negative
  fy: number // [-1,1] → vertical flip when negative
  rot: number // [-1,1]
  zoom: number // [0,1]
  tx: number // [-1,1]
  ty: number // [-1,1]
  hue: number // [-1,1]
  sat: number // [-1,1]
  bright: number // [-1,1]
}

const signed = () => Math.random() * 2 - 1

export function makeAugSeed(): AugSeed {
  return {
    fx: signed(), fy: signed(), rot: signed(), zoom: Math.random(),
    tx: signed(), ty: signed(), hue: signed(), sat: signed(), bright: signed(),
  }
}

/** CSS transform + filter approximating the augmentation for `seed`, for the
 *  live preview (the real transform happens in ultralytics at train time — this
 *  just shows the user what each knob does, like Roboflow). */
export function augSeedStyle(seed: AugSeed, aug: Augmentation): CSSProperties {
  const flipX = aug.fliplr > 0 && seed.fx < 0
  const flipY = aug.flipud > 0 && seed.fy < 0
  const rotate = seed.rot * aug.degrees
  const zoom = 1 + seed.zoom * aug.scale
  const tx = seed.tx * aug.translate * 100
  const ty = seed.ty * aug.translate * 100
  const hue = seed.hue * aug.hsv_h * 360
  const sat = Math.max(0, 1 + seed.sat * aug.hsv_s)
  const bright = Math.max(0.1, 1 + seed.bright * aug.hsv_v)
  return {
    transform: `translate(${tx.toFixed(1)}%, ${ty.toFixed(1)}%) scale(${zoom.toFixed(2)}) rotate(${rotate.toFixed(1)}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
    filter: `hue-rotate(${hue.toFixed(0)}deg) saturate(${sat.toFixed(2)}) brightness(${bright.toFixed(2)})`,
  }
}

/** Short labels for the augmentations currently enabled, for a summary line. */
export function enabledAugList(aug: Augmentation): string[] {
  const out: string[] = []
  if (aug.fliplr > 0) out.push("H-flip")
  if (aug.flipud > 0) out.push("V-flip")
  if (aug.degrees > 0) out.push(`Rotate ±${Math.round(aug.degrees)}°`)
  if (aug.scale > 0) out.push(`Zoom ${pctText(aug.scale)}`)
  if (aug.hsv_h > 0) out.push("Hue")
  if (aug.hsv_s > 0) out.push("Saturation")
  if (aug.hsv_v > 0) out.push("Brightness")
  if (aug.mosaic > 0) out.push(`Mosaic ${pctText(aug.mosaic)}`)
  if (aug.mixup > 0) out.push(`Mixup ${pctText(aug.mixup)}`)
  return out
}
