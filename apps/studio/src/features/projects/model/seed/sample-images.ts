// Sample images are drawn at seed time (needs a real canvas, so this module is
// kept apart from the pure content + planning code).

export const SAMPLE_IMAGE_SIZE = { width: 640, height: 420 }

const SCENES = [
  { sky: ["#bfdbfe", "#eff6ff"], ground: "#86efac", title: "Street scene" },
  { sky: ["#fde68a", "#fff7ed"], ground: "#d6d3d1", title: "Parking lot" },
  { sky: ["#c7d2fe", "#f5f3ff"], ground: "#a7f3d0", title: "Park" },
  { sky: ["#fecaca", "#fff1f2"], ground: "#e7e5e4", title: "Plaza" },
]

/**
 * A simple synthetic scene as a PNG data URL: a car, a person and a sign whose
 * positions vary with `variant`, so every sample has objects worth boxing,
 * outlining, classifying or captioning.
 */
export function sampleImageDataUrl(variant: number, caption?: string): string {
  const { width, height } = SAMPLE_IMAGE_SIZE
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx)
    throw new Error("Canvas is unavailable, so sample images can't be drawn.")
  const scene = SCENES[variant % SCENES.length]
  const shift = (variant * 97) % 220

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, scene.sky[0])
  sky.addColorStop(1, scene.sky[1])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = scene.ground
  ctx.fillRect(0, height * 0.68, width, height * 0.32)

  // Car
  const carX = 60 + shift
  ctx.fillStyle = ["#ef4444", "#2563eb", "#f59e0b", "#7c3aed"][variant % 4]
  ctx.fillRect(carX, 250, 190, 55)
  ctx.fillRect(carX + 35, 215, 110, 40)
  ctx.fillStyle = "#1f2937"
  for (const wheel of [carX + 40, carX + 150]) {
    ctx.beginPath()
    ctx.arc(wheel, 308, 20, 0, Math.PI * 2)
    ctx.fill()
  }

  // Person
  const personX = 470 - shift * 0.6
  ctx.fillStyle = "#0f766e"
  ctx.fillRect(personX - 14, 200, 28, 80)
  ctx.fillStyle = "#fbbf24"
  ctx.beginPath()
  ctx.arc(personX, 182, 18, 0, Math.PI * 2)
  ctx.fill()

  // Sign (ellipse) — something round for ellipse / keypoint tasks
  ctx.fillStyle = "#f8fafc"
  ctx.strokeStyle = "#dc2626"
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.ellipse(560 - (shift % 90), 90, 38, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#0f172a"
  ctx.font = "600 18px system-ui, sans-serif"
  ctx.fillText(caption ?? `${scene.title} ${variant + 1}`, 20, 34)

  return canvas.toDataURL("image/png")
}
