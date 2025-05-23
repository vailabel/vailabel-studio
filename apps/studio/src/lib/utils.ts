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

export function rgbToRgba(rgb: string | undefined, alpha: number): string {
  if (!rgb) {
    return "rgba(0, 0, 0, 0)" // Default to transparent black if rgb is null
  }
  // Extract all numbers from the rgb string
  const rgbValues = rgb.match(/\d+/g)?.map(Number)

  if (!rgbValues || rgbValues.length !== 3) {
    // throw new Error("Invalid RGB format. Expected format: 'rgb(r, g, b)'.")
    return rgb
  }

  const [r, g, b] = rgbValues
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
