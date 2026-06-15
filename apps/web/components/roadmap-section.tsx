"use client"

import { motion } from "framer-motion"
import { container, item } from "@/lib/motion"
import { Check, Clock, Circle, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Section, SectionHeading } from "@/components/ui/section"

type Status = "done" | "progress" | "planned"

const meta: Record<
  Status,
  { icon: LucideIcon; title: string; dot: string; tint: string }
> = {
  done: {
    icon: Check,
    title: "Shipped",
    dot: "bg-emerald-500",
    tint: "text-emerald-600 dark:text-emerald-400",
  },
  progress: {
    icon: Clock,
    title: "In progress",
    dot: "bg-amber-500",
    tint: "text-amber-600 dark:text-amber-400",
  },
  planned: {
    icon: Circle,
    title: "Planned",
    dot: "bg-primary",
    tint: "text-primary",
  },
}

const columns: { status: Status; items: { title: string; desc: string }[] }[] = [
  {
    status: "done",
    items: [
      { title: "Full annotation toolset", desc: "Box, polygon, point, line, circle, free-draw" },
      { title: "AI copilot", desc: "Detect, segment, suggest & QA labels" },
      { title: "YOLO + MobileSAM", desc: "Local ONNX inference, optional CUDA" },
      { title: "Multi-format export", desc: "COCO, YOLO, YOLO-Seg, VOC, LabelMe" },
      { title: "Cloud storage", desc: "S3, Azure Blob & GCS buckets" },
      { title: "Video annotation", desc: "Frame-by-frame with object tracking" },
    ],
  },
  {
    status: "progress",
    items: [
      { title: "Florence-2 engine", desc: "Captioning, OCR & open-vocab tasks" },
      { title: "SAM 2", desc: "Higher-quality interactive segmentation" },
      { title: "Dataset intelligence", desc: "Deeper quality & outlier insights" },
      { title: "Conversational copilot", desc: "Multi-turn labeling dialogue" },
    ],
  },
  {
    status: "planned",
    items: [
      { title: "Grounding DINO", desc: "Open-vocabulary detection" },
      { title: "Text & audio editors", desc: "NER, relations, ASR, segments" },
      { title: "OCR as a task", desc: "First-class text recognition" },
      { title: "Team collaboration", desc: "Multi-user projects" },
    ],
  },
]

export default function RoadmapSection() {
  return (
    <Section id="roadmap">
      <SectionHeading
        eyebrow="Roadmap"
        title="Shipped, building, and next"
        description="An honest view of where the studio is today and where it's headed."
      />

      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {columns.map((col) => {
          const m = meta[col.status]
          const Icon = m.icon
          return (
            <motion.div key={col.status} variants={item}>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${m.dot}`}
                >
                  <Icon size={13} />
                </span>
                <h3 className="font-semibold">{m.title}</h3>
              </div>
              <div className="space-y-3">
                {col.items.map((entry) => (
                  <Card
                    key={entry.title}
                    className="flex items-start gap-3 p-3.5"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${m.tint}`} />
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.desc}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </Section>
  )
}
