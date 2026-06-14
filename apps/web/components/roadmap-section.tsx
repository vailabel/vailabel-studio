"use client"

import { container, item } from "@/lib/motion"
import { motion } from "framer-motion"
import { Check, Clock, Circle, type LucideIcon } from "lucide-react"
import React from "react"

type Status = "done" | "progress" | "planned"

const statusIcon: Record<Status, LucideIcon> = {
  done: Check,
  progress: Clock,
  planned: Circle,
}

const columns: {
  status: Status
  title: string
  dot: string
  tint: string
  items: { title: string; description: string }[]
}[] = [
  {
    status: "done",
    title: "Completed",
    dot: "bg-green-500",
    tint: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    items: [
      {
        title: "Annotation tools",
        description: "Boxes, polygons, points, lines, circles, free-draw",
      },
      {
        title: "AI-assisted labeling",
        description: "Local ONNX models (YOLO-family)",
      },
      {
        title: "Multi-format export",
        description: "LabelMe, COCO, YOLO, Pascal VOC",
      },
    ],
  },
  {
    status: "progress",
    title: "In Progress",
    dot: "bg-yellow-500",
    tint: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    items: [
      { title: "Video annotation", description: "Frame-by-frame labeling" },
      {
        title: "Dataset intelligence",
        description: "Quality insights & analytics",
      },
      { title: "Cloud storage", description: "S3, Azure, and GCS buckets" },
    ],
  },
  {
    status: "planned",
    title: "Planned",
    dot: "bg-blue-500",
    tint: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    items: [
      { title: "Team collaboration", description: "Multi-user projects" },
      { title: "Active learning", description: "Model-in-the-loop labeling" },
      { title: "Cloud sync", description: "Optional project backup" },
    ],
  },
]

const RoadmapSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="brand-accent">Roadmap</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            See what&apos;s completed, in progress, and planned for future
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
            {columns.map((col) => {
              const Icon = statusIcon[col.status]
              return (
                <motion.div key={col.title} variants={item} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${col.dot}`}
                    >
                      <Icon size={14} />
                    </div>
                    <h3 className="font-bold text-lg">{col.title}</h3>
                  </div>

                  {col.items.map((entry) => (
                    <div
                      key={entry.title}
                      className="surface cloud-card p-3 rounded-xl flex items-start gap-2 hover:shadow-md"
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${col.tint}`}
                      >
                        <Icon size={12} />
                      </div>
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default RoadmapSection
