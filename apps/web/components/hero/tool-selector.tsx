"use client"

import { motion } from "framer-motion"
import { container, item } from "@/lib/motion"
import type { LabelingTool } from "./hero-tools"

type ToolSelectorProps = {
  tools: LabelingTool[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ToolSelector({ tools, activeIndex, onSelect }: ToolSelectorProps) {
  return (
    <motion.div
      className="flex flex-wrap justify-center gap-3 mb-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {tools.map((tool, index) => (
        <motion.div
          key={tool.name}
          className={`${
            index === activeIndex
              ? "scale-110 ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 dark:ring-offset-gray-900"
              : ""
          }
                bg-white dark:bg-gray-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-md transition-all duration-300`}
          variants={item}
          whileHover={{ scale: 1.05 }}
          onClick={() => onSelect(index)}
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
  )
}
