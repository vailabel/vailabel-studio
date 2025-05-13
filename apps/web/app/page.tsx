"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import {
  Github,
  Moon,
  Sun,
  ArrowRight,
  Square,
  Hexagon,
  Pencil,
  Wand2,
  Layers,
  MousePointer,
  Check,
  Tag,
  ExternalLink,
  Clock,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function Home() {
  const [darkMode, setDarkMode] = useState(false)
  const [activeToolIndex, setActiveToolIndex] = useState(0)
  const [animationPhase, setAnimationPhase] = useState(0)
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
      color: "bg-blue-500",
      description: "Create bounding boxes around objects for quick labeling",
    },
    {
      name: "Polygon Tool",
      icon: <Hexagon className="w-5 h-5" />,
      color: "bg-purple-500",
      description:
        "Draw precise polygons for irregular shapes and detailed annotations",
    },
    {
      name: "Brush Tool",
      icon: <Pencil className="w-5 h-5" />,
      color: "bg-green-500",
      description: "Free-form drawing for pixel-perfect segmentation masks",
    },
    {
      name: "AI Assist",
      icon: <Wand2 className="w-5 h-5" />,
      color: "bg-amber-500",
      description: "Auto-label with YOLOv8 AI detection for 5x faster workflow",
    },
    {
      name: "Layer Manager",
      icon: <Layers className="w-5 h-5" />,
      color: "bg-pink-500",
      description: "Organize and manage annotation layers for complex projects",
    },
  ]

  useEffect(() => {
    // Check user preference
    const isDark =
      localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    setDarkMode(isDark)
  }, [])

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    }
  }, [darkMode])

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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">Vision AI Label Studio</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/documentation"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Docs
              </Link>
              <Link
                href="/updates"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Updates
              </Link>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                GitHub
              </a>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section with Animation */}
        <section className="py-16 md:py-24 overflow-hidden">
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
                Label smarter and faster with AI-assisted annotations, beautiful
                UI, and full offline support.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                <motion.a
                  href="#"
                  className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started <ArrowRight size={18} />
                </motion.a>
                <motion.a
                  href="#"
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
                    className={`${index === activeToolIndex ? "scale-110 ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 dark:ring-offset-gray-900" : ""} 
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
                  className="h-12 mb-8"
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
                    src="/placeholder.svg?height=720&width=1280"
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
                          className={`p-2 rounded-md ${index === activeToolIndex ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
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

        {/* Feature Highlights */}
        <section className="py-16 bg-gray-100 dark:bg-gray-800/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Everything you need for efficient image annotation and labeling
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {/* Feature 1 */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
                variants={item}
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Manual Annotations
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create boxes, polygons, and free-form drawings with precision
                  tools.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
                variants={item}
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  AI Labeling with YOLOv8
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Accelerate your workflow with AI-assisted auto-labeling.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
                variants={item}
              >
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Multi-Format Export
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Export to COCO, YOLO, Pascal VOC, and JSON formats.
                </p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
                variants={item}
              >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Offline Project Storage
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Store projects locally with Dexie.js for complete offline
                  support.
                </p>
              </motion.div>

              {/* Feature 5 */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
                variants={item}
              >
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Cross-platform Desktop App
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Use on Windows, macOS, or Linux with the same great
                  experience.
                </p>
              </motion.div>

              {/* Feature 6 */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
                variants={item}
              >
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center text-pink-600 dark:text-pink-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Responsive Light/Dark UI
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Beautiful interface that adapts to your preferences and
                  environment.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Documentation & Blog Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Documentation & Resources
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Everything you need to get started and make the most of Vision
                AI Label Studio
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Documentation */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-4">Documentation</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold">Quick Start Guide</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Get up and running in less than 5 minutes
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold">Installation</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Step-by-step installation instructions for all platforms
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold">Export Formats</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Learn about supported export formats and configurations
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold">AI Integration</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        How to use YOLOv8 for auto-labeling your images
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Link
                      href="/documentation"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View all documentation <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Blog */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-4">Latest Updates</h3>
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        May 10, 2025
                      </div>
                      <h4 className="font-semibold text-lg">
                        YOLOv8 Integration Now Available
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        We've integrated YOLOv8 for AI-assisted labeling, making
                        annotation up to 5x faster.
                      </p>
                    </div>
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        April 22, 2025
                      </div>
                      <h4 className="font-semibold text-lg">
                        New Export Formats Added
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Added support for Pascal VOC and COCO JSON export
                        formats.
                      </p>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        March 15, 2025
                      </div>
                      <h4 className="font-semibold text-lg">
                        Version 1.0 Released
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        First stable release with core annotation features and
                        offline storage.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Link
                      href="/updates"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View all updates <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="py-16 bg-gradient-to-b from-gray-100 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                See It In Action
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Watch how Vision AI Label Studio makes image annotation fast and
                efficient
              </p>
            </motion.div>

            <motion.div
              className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="aspect-video relative bg-gray-200 dark:bg-gray-800">
                <Image
                  src="/placeholder.svg?height=720&width=1280"
                  alt="Vision AI Label Studio Demo"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-8 h-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Demo: AI-assisted annotation workflow
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                      />
                    </svg>
                  </button>
                  <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Roadmap</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                See what's completed, in progress, and planned for future
                releases
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                {/* Completed */}
                <motion.div variants={item} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <Check size={14} />
                    </div>
                    <h3 className="font-bold text-lg">Completed</h3>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                      <Check size={12} />
                    </div>
                    <div>
                      <p className="font-medium">Manual Annotations</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Boxes, polygons, free draw
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                      <Check size={12} />
                    </div>
                    <div>
                      <p className="font-medium">Offline Storage</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Using Dexie.js
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                      <Check size={12} />
                    </div>
                    <div>
                      <p className="font-medium">YOLO Export</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Standard format support
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* In Progress */}
                <motion.div variants={item} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                      <Clock size={14} />
                    </div>
                    <h3 className="font-bold text-lg">In Progress</h3>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mt-0.5">
                      <Clock size={12} />
                    </div>
                    <div>
                      <p className="font-medium">YOLOv8 Integration</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        AI-assisted labeling
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mt-0.5">
                      <Clock size={12} />
                    </div>
                    <div>
                      <p className="font-medium">COCO Export</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        JSON format support
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mt-0.5">
                      <Clock size={12} />
                    </div>
                    <div>
                      <p className="font-medium">Pascal VOC Export</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        XML format support
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Planned */}
                <motion.div variants={item} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-bold text-lg">Planned</h3>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Video Annotation</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Frame-by-frame labeling
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Team Collaboration</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Multi-user projects
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Cloud Sync</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Optional project backup
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to transform your image labeling workflow?
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                Start using Vision AI Label Studio today and experience the
                power of AI-assisted annotation.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <motion.a
                  href="#"
                  className="px-8 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Download Now <ArrowRight size={18} />
                </motion.a>
                <motion.a
                  href="#"
                  className="px-8 py-3 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Github size={18} /> Star on GitHub
                </motion.a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 py-12 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Vision AI Label Studio</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A powerful, open-source image labeling tool with AI assistance.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <Github size={20} />
                </a>
                <a
                  href="#"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
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
                      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
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
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/documentation"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    API Reference
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Examples
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Community</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Contributing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    License (GNU GPL)
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Terms of Use
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
            <p>
              © {new Date().getFullYear()} Vision AI Label Studio. Released
              under the GNU GPL License.
            </p>
            <div className="flex justify-center mt-4 space-x-4">
              <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                <span>Made with</span>
                <span className="text-red-500">❤</span>
                <span>by the open source community</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
