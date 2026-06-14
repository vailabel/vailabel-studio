import { useEffect, useState } from "react"
import { useAnimation } from "framer-motion"
import { labelingTools } from "./hero-tools"

type AnimationControls = ReturnType<typeof useAnimation>

export type ToolControls = {
  cursor: AnimationControls
  box: AnimationControls
  polygon: AnimationControls
  brush: AnimationControls
  ai: AnimationControls
  layer: AnimationControls
}

/**
 * Owns the active tool selection and drives the per-tool labeling animation
 * shown in the hero canvas. Each time a tool's sequence finishes it advances to
 * the next tool, looping through {@link labelingTools}.
 */
export function useToolAnimation() {
  const [activeToolIndex, setActiveToolIndex] = useState(0)
  const cursor = useAnimation()
  const box = useAnimation()
  const polygon = useAnimation()
  const brush = useAnimation()
  const ai = useAnimation()
  const layer = useAnimation()

  useEffect(() => {
    const toolAnimationSequence = async () => {
      // Reset all annotation overlays
      await Promise.all([
        box.start({ opacity: 0 }),
        polygon.start({ opacity: 0 }),
        brush.start({ opacity: 0 }),
        ai.start({ opacity: 0 }),
        layer.start({ opacity: 0 }),
      ])

      // Box Tool Animation (index 0)
      if (activeToolIndex === 0) {
        // Move cursor to starting position
        await cursor.start({
          x: 200,
          y: 150,
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Draw box
        await box.start({
          opacity: 1,
          width: 0,
          height: 0,
          x: 200,
          y: 150,
          transition: { duration: 0.1 },
        })

        await cursor.start({
          x: 320,
          y: 230,
          transition: { duration: 1 },
        })

        await box.start({
          width: 120,
          height: 80,
          transition: { duration: 1, ease: "linear" },
        })

        // Show label
        await box.start({
          scale: [1, 1.05, 1],
          transition: { duration: 0.5 },
        })

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Polygon Tool Animation (index 1)
      else if (activeToolIndex === 1) {
        const points = [
          [400, 100],
          [450, 150],
          [500, 130],
          [520, 200],
          [450, 250],
          [380, 220],
          [400, 100], // Close the polygon
        ]

        // Show cursor and start at first point
        await cursor.start({
          x: points[0][0],
          y: points[0][1],
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Make polygon visible
        await polygon.start({ opacity: 1, pathLength: 0 })

        // Draw each segment of the polygon
        for (let i = 1; i < points.length; i++) {
          await cursor.start({
            x: points[i][0],
            y: points[i][1],
            transition: { duration: 0.4 },
          })

          await polygon.start({
            pathLength: i / (points.length - 1),
            transition: { duration: 0.4 },
          })
        }

        // Fill the polygon
        await polygon.start({
          fill: "rgba(168, 85, 247, 0.2)",
          transition: { duration: 0.3 },
        })

        // Show label
        await polygon.start({
          scale: [1, 1.05, 1],
          transition: { duration: 0.5 },
        })

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Brush Tool Animation (index 2)
      else if (activeToolIndex === 2) {
        // Show brush tool and cursor
        await brush.start({ opacity: 1 })
        await cursor.start({
          x: 250,
          y: 180,
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Draw brush strokes - create path that follows cursor
        const brushPath = [
          [250, 180],
          [270, 190],
          [290, 185],
          [310, 175],
          [330, 180],
          [350, 190],
          [370, 185],
          [390, 175],
          [410, 180],
        ]

        // Initialize an empty path
        await brush.start({
          d: `M${brushPath[0][0]},${brushPath[0][1]}`,
          pathLength: 1,
          transition: { duration: 0.1 },
        })

        // Draw the path segment by segment, following the cursor
        for (let i = 0; i < brushPath.length - 1; i++) {
          // Move cursor to next point
          await cursor.start({
            x: brushPath[i + 1][0],
            y: brushPath[i + 1][1],
            transition: { duration: 0.2 },
          })

          // Extend the path to include the new segment
          const newPathD =
            `M${brushPath[0][0]},${brushPath[0][1]} ` +
            brushPath
              .slice(1, i + 2)
              .map((point) => `L${point[0]},${point[1]}`)
              .join(" ")

          // Update the path
          await brush.start({
            d: newPathD,
            transition: { duration: 0.1 },
          })
        }

        // Show completed brush stroke
        await brush.start({
          scale: [1, 1.05, 1],
          transition: { duration: 0.5 },
        })

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // AI Assist Animation (index 3)
      else if (activeToolIndex === 3) {
        // Hide cursor for AI animation
        await cursor.start({
          opacity: 0,
          transition: { duration: 0.3 },
        })

        // Show AI scanning effect
        await ai.start({
          opacity: 1,
          scale: 1,
          transition: { duration: 0.5 },
        })

        // Pulse effect
        await ai.start({
          scale: [1, 1.1, 1],
          opacity: [0.7, 0.9, 0.7],
          transition: {
            duration: 1.5,
            repeat: 1,
            repeatType: "reverse",
          },
        })

        // Show AI detection results
        await Promise.all([
          box.start({
            opacity: 1,
            x: 200,
            y: 150,
            width: 120,
            height: 80,
            transition: { duration: 0.3 },
          }),

          polygon.start({
            opacity: 1,
            pathLength: 1,
            fill: "rgba(168, 85, 247, 0.2)",
            transition: { duration: 0.3, delay: 0.1 },
          }),

          // Add another box for multiple detections
          layer.start({
            opacity: 1,
            transition: { duration: 0.3, delay: 0.2 },
          }),
        ])

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Fade out AI effect
        await ai.start({
          opacity: 0,
          transition: { duration: 0.5 },
        })
      }

      // Layer Manager Animation (index 4)
      else if (activeToolIndex === 4) {
        // Show all annotations
        await Promise.all([
          box.start({
            opacity: 1,
            x: 200,
            y: 150,
            width: 120,
            height: 80,
            transition: { duration: 0.3 },
          }),

          polygon.start({
            opacity: 1,
            pathLength: 1,
            fill: "rgba(168, 85, 247, 0.2)",
            transition: { duration: 0.3 },
          }),

          layer.start({
            opacity: 1,
            transition: { duration: 0.3 },
          }),
        ])

        // Show cursor
        await cursor.start({
          x: 650,
          y: 100,
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Highlight layers one by one
        await box.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.8 },
        })

        await polygon.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.8 },
        })

        await layer.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.8 },
        })

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Move to next tool after animation completes
      setActiveToolIndex((prev) => (prev + 1) % labelingTools.length)
    }

    // Start the animation sequence
    toolAnimationSequence()
  }, [activeToolIndex, box, polygon, brush, ai, layer, cursor])

  const controls: ToolControls = { cursor, box, polygon, brush, ai, layer }
  return { activeToolIndex, setActiveToolIndex, controls }
}
