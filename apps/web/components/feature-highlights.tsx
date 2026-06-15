"use client"

import { motion } from "framer-motion"
import { container, item } from "@/lib/motion"
import {
  Shapes,
  Wand2,
  FileDown,
  ShieldCheck,
  Cloud,
  Clapperboard,
  type LucideIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Section, SectionHeading } from "@/components/ui/section"

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  tint: string
}

const features: Feature[] = [
  {
    icon: Shapes,
    title: "Every annotation tool",
    description:
      "Bounding boxes, polygons, points, lines, circles, free-draw, and SAM smart-segment — each with a single-key shortcut.",
    tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Wand2,
    title: "Offline AI copilot",
    description:
      "Ask it to detect, segment, suggest labels, or QA your work. Local ONNX models, human-in-the-loop, zero cloud calls.",
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: FileDown,
    title: "Export anywhere",
    description:
      "One click to LabelMe, COCO, YOLO (detection & segmentation), and Pascal VOC — ready for any training pipeline.",
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: ShieldCheck,
    title: "Local-first & private",
    description:
      "Projects live in a local SQLite database on your machine. Nothing is uploaded unless you choose to.",
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    icon: Cloud,
    title: "Bring your own cloud",
    description:
      "Optionally connect S3, Azure Blob, or Google Cloud Storage. Credentials are kept in your OS keychain.",
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Clapperboard,
    title: "Video & multi-modal",
    description:
      "Frame-by-frame video labeling with object tracking, plus a multi-modal architecture spanning image, video, text & audio.",
    tint: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
]

export default function FeatureHighlights() {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to label faster"
        description="A focused, native annotation studio — not a browser tab. Built for speed, privacy, and real ML workflows."
      />

      <motion.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={item}>
            <Card className="cloud-card h-full p-6 hover:shadow-md">
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.tint}`}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  )
}
