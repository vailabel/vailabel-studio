import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportToJson(data: unknown, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getRandomColor(): string {
  const randomValue = () => Math.floor(Math.random() * 256)
  const r = randomValue()
  const g = randomValue()
  const b = randomValue()
  return `rgb(${r}, ${g}, ${b})`
}

export function rgbToRgba(rgb: string, alpha: number): string {
  // Extract all numbers from the rgb string
  const rgbValues = rgb.match(/\d+/g)?.map(Number)

  if (!rgbValues || rgbValues.length !== 3) {
    // throw new Error("Invalid RGB format. Expected format: 'rgb(r, g, b)'.")
    return rgb
  }

  const [r, g, b] = rgbValues
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
