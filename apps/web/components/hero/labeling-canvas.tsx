"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import {
  Square,
  Hexagon,
  Pencil,
  Wand2,
  MousePointer,
  Check,
  Tag,
} from "lucide-react"
import type { LabelingTool } from "./hero-tools"
import type { ToolControls } from "./use-tool-animation"

type LabelingCanvasProps = {
  tools: LabelingTool[]
  activeIndex: number
  onSelect: (index: number) => void
  controls: ToolControls
}

export function LabelingCanvas({
  tools,
  activeIndex,
  onSelect,
  controls,
}: LabelingCanvasProps) {
  return (
    <motion.div
      className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <div className="aspect-video relative">
        <Image
          src={tools[activeIndex].image}
          alt="Vision AI Label Studio Interface"
          fill
          className="object-cover"
        />

        {/* Animated Labeling Overlay */}
        <div className="absolute inset-0">
          {/* Animated cursor */}
          <motion.div
            className="absolute z-50"
            animate={controls.cursor}
            initial={{ opacity: 0 }}
          >
            <MousePointer className="w-6 h-6 text-blue-500 drop-shadow-lg" />
          </motion.div>

          {/* Animated bounding box */}
          <motion.div
            className="absolute border-2 border-blue-500 rounded-md bg-blue-500/20"
            initial={{ opacity: 0, width: 0, height: 0 }}
            animate={controls.box}
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
            animate={controls.polygon}
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
            animate={controls.brush}
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
            animate={controls.ai}
          >
            <div className="w-full h-full bg-gradient-to-r from-amber-500/10 to-amber-500/30 rounded-full flex items-center justify-center">
              <Wand2 className="w-16 h-16 text-amber-500" />
            </div>
          </motion.div>

          {/* Layer manager animation */}
          <motion.div
            className="absolute top-20 right-20 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 w-48"
            initial={{ opacity: 0, x: 20 }}
            animate={controls.layer}
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
            {tools.map((tool, index) => (
              <motion.button
                key={tool.name}
                className={`p-2 rounded-md ${
                  index === activeIndex
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(index)}
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
  )
}
