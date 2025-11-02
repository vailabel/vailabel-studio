"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import {
  ArrowRight,
  Github,
  Square,
  Hexagon,
  Pencil,
  Wand2,
  Layers,
  MousePointer,
  Check,
  Tag,
} from "lucide-react"
import Image from "next/image"
import { data } from "@/app/data"
import { container, item } from "@/lib/motion"
import DownloadButton from "./DownloadButton"

const HeroSection = () => {
  const [activeToolIndex, setActiveToolIndex] = useState(0)
  const heroImageRef = useRef(null)
  const cursorControls = useAnimation()
  const boxControls = useAnimation()
  const polygonControls = useAnimation()
  const brushControls = useAnimation()
  const aiControls = useAnimation()
  const layerControls = useAnimation()

  const labelingTools = [
    {
      name: "Box Tool",
      icon: <Square className="w-5 h-5" />,
      image: "/demo-cars.svg",
      color: "bg-blue-500",
      description: "Create bounding boxes around objects for quick labeling",
    },
    {
      name: "Polygon Tool",
      icon: <Hexagon className="w-5 h-5" />,
      image: "/demo-people.svg",
      color: "bg-purple-500",
      description:
        "Draw precise polygons for irregular shapes and detailed annotations",
    },
    {
      name: "Brush Tool",
      icon: <Pencil className="w-5 h-5" />,
      image: "/demo-nature.svg",
      color: "bg-green-500",
      description: "Free-form drawing for pixel-perfect segmentation masks",
    },
    {
      name: "AI Assist",
      icon: <Wand2 className="w-5 h-5" />,
      image: "/demo-warehouse.svg",
      color: "bg-amber-500",
      description: "Auto-label with YOLOv8 AI detection for 5x faster workflow",
    },
    {
      name: "Layer Manager",
      icon: <Layers className="w-5 h-5" />,
      image: "/demo-layers.svg",
      color: "bg-pink-500",
      description: "Organize and manage annotation layers for complex projects",
    },
  ]
  // Animation sequence for tools
  useEffect(() => {
    const toolAnimationSequence = async () => {
      // Reset all animations
      await Promise.all([
        boxControls.start({ opacity: 0 }),
        polygonControls.start({ opacity: 0 }),
        brushControls.start({ opacity: 0 }),
        aiControls.start({ opacity: 0 }),
        layerControls.start({ opacity: 0 }),
      ])

      // Box Tool Animation (index 0)
      if (activeToolIndex === 0) {
        // Move cursor to starting position
        await cursorControls.start({
          x: 200,
          y: 150,
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Draw box
        await boxControls.start({
          opacity: 1,
          width: 0,
          height: 0,
          x: 200,
          y: 150,
          transition: { duration: 0.1 },
        })

        await cursorControls.start({
          x: 320,
          y: 230,
          transition: { duration: 1 },
        })

        await boxControls.start({
          width: 120,
          height: 80,
          transition: { duration: 1, ease: "linear" },
        })

        // Show label
        await boxControls.start({
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
        await cursorControls.start({
          x: points[0][0],
          y: points[0][1],
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Make polygon visible
        await polygonControls.start({ opacity: 1, pathLength: 0 })

        // Draw each segment of the polygon
        for (let i = 1; i < points.length; i++) {
          await cursorControls.start({
            x: points[i][0],
            y: points[i][1],
            transition: { duration: 0.4 },
          })

          await polygonControls.start({
            pathLength: i / (points.length - 1),
            transition: { duration: 0.4 },
          })
        }

        // Fill the polygon
        await polygonControls.start({
          fill: "rgba(168, 85, 247, 0.2)",
          transition: { duration: 0.3 },
        })

        // Show label
        await polygonControls.start({
          scale: [1, 1.05, 1],
          transition: { duration: 0.5 },
        })

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Brush Tool Animation (index 2)
      else if (activeToolIndex === 2) {
        // Show brush tool and cursor
        await brushControls.start({ opacity: 1 })
        await cursorControls.start({
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
        await brushControls.start({
          d: `M${brushPath[0][0]},${brushPath[0][1]}`,
          pathLength: 1,
          transition: { duration: 0.1 },
        })

        // Draw the path segment by segment, following the cursor
        for (let i = 0; i < brushPath.length - 1; i++) {
          // Move cursor to next point
          await cursorControls.start({
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
          await brushControls.start({
            d: newPathD,
            transition: { duration: 0.1 },
          })
        }

        // Show completed brush stroke
        await brushControls.start({
          scale: [1, 1.05, 1],
          transition: { duration: 0.5 },
        })

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // AI Assist Animation (index 3)
      else if (activeToolIndex === 3) {
        // Hide cursor for AI animation
        await cursorControls.start({
          opacity: 0,
          transition: { duration: 0.3 },
        })

        // Show AI scanning effect
        await aiControls.start({
          opacity: 1,
          scale: 1,
          transition: { duration: 0.5 },
        })

        // Pulse effect
        await aiControls.start({
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
          boxControls.start({
            opacity: 1,
            x: 200,
            y: 150,
            width: 120,
            height: 80,
            transition: { duration: 0.3 },
          }),

          polygonControls.start({
            opacity: 1,
            pathLength: 1,
            fill: "rgba(168, 85, 247, 0.2)",
            transition: { duration: 0.3, delay: 0.1 },
          }),

          // Add another box for multiple detections
          layerControls.start({
            opacity: 1,
            transition: { duration: 0.3, delay: 0.2 },
          }),
        ])

        // Hold for a moment
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Fade out AI effect
        await aiControls.start({
          opacity: 0,
          transition: { duration: 0.5 },
        })
      }

      // Layer Manager Animation (index 4)
      else if (activeToolIndex === 4) {
        // Show all annotations
        await Promise.all([
          boxControls.start({
            opacity: 1,
            x: 200,
            y: 150,
            width: 120,
            height: 80,
            transition: { duration: 0.3 },
          }),

          polygonControls.start({
            opacity: 1,
            pathLength: 1,
            fill: "rgba(168, 85, 247, 0.2)",
            transition: { duration: 0.3 },
          }),

          layerControls.start({
            opacity: 1,
            transition: { duration: 0.3 },
          }),
        ])

        // Show cursor
        await cursorControls.start({
          x: 650,
          y: 100,
          opacity: 1,
          transition: { duration: 0.5 },
        })

        // Highlight layers one by one
        await boxControls.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.8 },
        })

        await polygonControls.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.8 },
        })

        await layerControls.start({
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

    // No need for interval as we're controlling the sequence manually
  }, [
    activeToolIndex,
    boxControls,
    polygonControls,
    brushControls,
    aiControls,
    layerControls,
    cursorControls,
  ])

  return (
    <section className="py-16 md:py-24 overflow-hidden" id="download">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
            Vision AI Label Studio
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8">
            Label smarter and faster with AI-assisted annotations, beautiful UI,
            and full offline support.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 relative">
            <motion.a
              href={data.productionUrl}
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started <ArrowRight size={18} />
            </motion.a>
            <DownloadButton />
            <motion.a
              href={data.repoUrl}
              className="px-8 py-3 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Github size={18} /> View on GitHub
            </motion.a>
          </div>

          {/* Labeling Tools Showcase */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mb-12"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {labelingTools.map((tool, index) => (
              <motion.div
                key={tool.name}
                className={`${
                  index === activeToolIndex
                    ? "scale-110 ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 dark:ring-offset-gray-900"
                    : ""
                } 
                      bg-white dark:bg-gray-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-md transition-all duration-300`}
                variants={item}
                whileHover={{ scale: 1.05 }}
                onClick={() => setActiveToolIndex(index)}
              >
                <span
                  className={`w-6 h-6 rounded-full ${tool.color} flex items-center justify-center text-white`}
                >
                  {tool.icon}
                </span>
                <span>{tool.name}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Active Tool Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeToolIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-10 mb-5"
            >
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {labelingTools[activeToolIndex].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Hero Image with Animation */}
          <motion.div
            className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            ref={heroImageRef}
          >
            <div className="aspect-video relative">
              <Image
                src={labelingTools[activeToolIndex].image}
                alt="Vision AI Label Studio Interface"
                fill
                className="object-cover"
              />

              {/* Animated Labeling Overlay */}
              <div className="absolute inset-0">
                {/* Animated cursor */}
                <motion.div
                  className="absolute z-50"
                  animate={cursorControls}
                  initial={{ opacity: 0 }}
                >
                  <MousePointer className="w-6 h-6 text-blue-500 drop-shadow-lg" />
                </motion.div>

                {/* Animated bounding box */}
                <motion.div
                  className="absolute border-2 border-blue-500 rounded-md bg-blue-500/20"
                  initial={{ opacity: 0, width: 0, height: 0 }}
                  animate={boxControls}
                >
                  <motion.div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Tag size={10} />
                    <span>Person: 98%</span>
                  </motion.div>
                </motion.div>

                {/* Animated polygon */}
                <motion.svg
                  className="absolute top-0 left-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={polygonControls}
                >
                  <motion.polygon
                    points="400,100 450,150 500,130 520,200 450,250 380,220 400,100"
                    className="fill-transparent stroke-purple-500 stroke-2"
                    initial={{
                      pathLength: 0,
                      fill: "rgba(168, 85, 247, 0)",
                    }}
                  />
                  <motion.text
                    x="420"
                    y="90"
                    className="fill-purple-500 text-xs font-medium"
                  >
                    Car: 95%
                  </motion.text>
                </motion.svg>

                {/* Brush tool animation */}
                <motion.svg
                  className="absolute top-0 left-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={brushControls}
                >
                  <motion.path
                    d="M250,180 C270,190 290,185 310,175 C330,180 350,190 370,185 C390,175 410,180 430,175"
                    className="fill-transparent stroke-green-500 stroke-2 stroke-linecap-round"
                    initial={{ d: "M250,180", pathLength: 1 }}
                  />
                  <motion.text
                    x="250"
                    y="160"
                    className="fill-green-500 text-xs font-medium"
                  >
                    Segmentation Mask
                  </motion.text>
                </motion.svg>

                {/* AI detection animation */}
                <motion.div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={aiControls}
                >
                  <div className="w-full h-full bg-gradient-to-r from-amber-500/10 to-amber-500/30 rounded-full flex items-center justify-center">
                    <Wand2 className="w-16 h-16 text-amber-500" />
                  </div>
                </motion.div>

                {/* Layer manager animation */}
                <motion.div
                  className="absolute top-20 right-20 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 w-48"
                  initial={{ opacity: 0, x: 20 }}
                  animate={layerControls}
                >
                  <div className="text-xs font-medium mb-2">Layers</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-1.5 rounded bg-blue-50 dark:bg-blue-900/20">
                      <Square className="w-3 h-3 text-blue-500" />
                      <span className="text-xs">Person</span>
                      <div className="ml-auto">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-purple-50 dark:bg-purple-900/20">
                      <Hexagon className="w-3 h-3 text-purple-500" />
                      <span className="text-xs">Car</span>
                      <div className="ml-auto">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-green-50 dark:bg-green-900/20">
                      <Pencil className="w-3 h-3 text-green-500" />
                      <span className="text-xs">Mask</span>
                      <div className="ml-auto">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/30 to-transparent"></div>
            </div>

            {/* Interface Controls Mockup */}
            <div className="bg-white dark:bg-gray-800 p-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {labelingTools.map((tool, index) => (
                    <motion.button
                      key={tool.name}
                      className={`p-2 rounded-md ${
                        index === activeToolIndex
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveToolIndex(index)}
                      title={tool.name}
                    >
                      {tool.icon}
                    </motion.button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                  </button>
                  <button className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m15 15-6 6m0 0-6-6m6 6V9a6 6 0 0 1 12 0v3"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection
