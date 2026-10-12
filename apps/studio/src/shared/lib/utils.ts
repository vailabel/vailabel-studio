import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomColor(): string {
  const randomValue = () => Math.floor(Math.random() * 256)
  const r = randomValue()
  const g = randomValue()
  const b = randomValue()
  return `rgb(${r}, ${g}, ${b})`
}

export function hxToRgb(hex: string): string {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, "")
  // Parse r, g, b values
  const bigint = parseInt(hex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  // Return rgb string
  return `rgb(${r}, ${g}, ${b})`
}

export function getContentBoxColor(color: string, alpha: number): string {
  // Check if the color is in hex format
  if (color.startsWith("#")) {
    const rgb = hxToRgb(color)
    return rgbToRgba(rgb, alpha)
  }
  // If it's not hex, assume it's already in rgb format
  return rgbToRgba(color, alpha)
}

// Named colors ("green", "gold") are resolved by the browser: assigning one to
// a canvas fill style reads back as "#rrggbb". Cached — configs reuse a handful.
const namedColorCache = new Map<string, string | null>()
function resolveNamedColor(color: string): string | null {
  if (namedColorCache.has(color)) return namedColorCache.get(color) ?? null
  let resolved: string | null = null
  try {
    const context = document.createElement("canvas").getContext("2d")
    if (context) {
      context.fillStyle = "#000000"
      context.fillStyle = color
      // An unknown name leaves the previous style in place.
      const value = String(context.fillStyle)
      resolved = value !== "#000000" || /^black$/i.test(color) ? value : null
    }
  } catch {
    resolved = null
  }
  namedColorCache.set(color, resolved)
  return resolved
}

/**
 * The same color at the given opacity. Accepts what label colors actually come
 * as: "rgb(r, g, b)", "#rgb" / "#rrggbb", or a CSS color name. Anything else is
 * returned unchanged (opaque) rather than guessed at.
 */
export function rgbToRgba(color: string | undefined, alpha: number): string {
  if (!color) {
    return "rgba(0, 0, 0, 0)" // Default to transparent black if there is no color
  }
  const value = color.trim()

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1]
  if (hex) {
    const full =
      hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex
    const channels = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16))
    return `rgba(${channels.join(", ")}, ${alpha})`
  }

  if (/^rgba?\(/i.test(value)) {
    const channels = value
      .match(/\d+(\.\d+)?/g)
      ?.slice(0, 3)
      .map(Number)
    if (channels?.length === 3) return `rgba(${channels.join(", ")}, ${alpha})`
    return color
  }

  if (/^[a-z]+$/i.test(value)) {
    const resolved = resolveNamedColor(value.toLowerCase())
    if (resolved && resolved.startsWith("#")) return rgbToRgba(resolved, alpha)
  }
  return color
}
