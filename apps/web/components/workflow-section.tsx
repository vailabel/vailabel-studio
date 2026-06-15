"use client"

import { motion } from "framer-motion"
import { Boxes, FileDown, HardDrive, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Section, SectionHeading } from "@/components/ui/section"

const groups: {
  icon: LucideIcon
  title: string
  description: string
  items: string[]
}[] = [
  {
    icon: Boxes,
    title: "Project types",
    description: "Pick a task and the right tools light up.",
    items: [
      "Object detection",
      "Semantic segmentation",
      "Image classification",
      "Keypoints",
      "Mixed shapes",
    ],
  },
  {
    icon: FileDown,
    title: "Export formats",
    description: "Train with the tools you already use.",
    items: [
      "COCO",
      "YOLO",
      "YOLO-Seg",
      "Pascal VOC",
      "LabelMe JSON",
    ],
  },
  {
    icon: HardDrive,
    title: "Storage",
    description: "Local by default, cloud when you want it.",
    items: ["Local SQLite", "Amazon S3", "Azure Blob", "Google Cloud Storage"],
  },
]

export default function WorkflowSection() {
  return (
    <Section className="bg-muted/30">
      <SectionHeading
        eyebrow="Workflow"
        title="Fits the stack you already have"
        description="From first label to training-ready dataset — without forcing a new format or a cloud account on you."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((g, i) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Card className="h-full p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <g.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{g.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {g.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
