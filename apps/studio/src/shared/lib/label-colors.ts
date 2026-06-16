/** Shared preset swatches used by the label create/edit forms and the inline
 *  labels table. Kept in its own module so it can be imported without pulling
 *  in component code (and to keep Fast Refresh happy). */
export const colorPalette = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e42", // orange
  "#a855f7", // purple
  "#fbbf24", // yellow
  "#6366f1", // indigo
  "#6b7280", // gray
  "#ec4899", // pink
  "#14b8a6", // teal
]

function hslToHex(h: number, s: number, l: number): string {
  const lFrac = l / 100
  const a = (s * Math.min(lFrac, 1 - lFrac)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = lFrac - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * A vivid, evenly-saturated random hex color for new labels. Generated in HSL
 * (random hue, fixed saturation/lightness) so colors stay distinct and readable
 * — unlike fully-random RGB, which often lands on muddy or near-white values —
 * and stays hex so it round-trips through the color picker and swatches.
 */
export function randomLabelColor(): string {
  const hue = Math.floor(Math.random() * 360)
  return hslToHex(hue, 70, 55)
}
