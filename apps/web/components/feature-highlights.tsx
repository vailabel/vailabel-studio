"use client"

import { container, item } from "@/lib/motion"
import { motion } from "framer-motion"
import {
  Shapes,
  Wand2,
  FileDown,
  Database,
  Cloud,
  Laptop,
  type LucideIcon,
} from "lucide-react"

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  tint: string
}

const features: Feature[] = [
  {
    icon: Shapes,
    title: "Annotation Tools",
    description:
      "Draw boxes, polygons, points, lines, circles, and free-form masks with precise editing.",
    tint: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Wand2,
    title: "AI-Assisted Labeling",
    description:
      "Auto-detect objects with local ONNX models (YOLO-family) — GPU-accelerated and fully offline.",
    tint: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: FileDown,
    title: "Multi-Format Export",
    description: "Export annotations to LabelMe, COCO, YOLO, and Pascal VOC.",
    tint: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Database,
    title: "Local-First & Offline",
    description:
      "Projects are stored locally in SQLite — your data never leaves your machine.",
    tint: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  {
    icon: Cloud,
    title: "Cloud Storage",
    description:
      "Optionally connect your own S3, Azure, or GCS bucket for image storage.",
    tint: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    icon: Laptop,
    title: "Cross-Platform Desktop",
    description: "Runs natively on Windows, macOS, and Linux — built with Tauri.",
    tint: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  },
]

const FeatureHighlights = () => {
  return (
    <section className="relative py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Powerful <span className="brand-accent">Features</span>
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
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="surface cloud-card rounded-2xl p-6 shadow-sm hover:shadow-md"
              variants={item}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.tint}`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default FeatureHighlights
