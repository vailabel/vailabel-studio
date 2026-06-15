"use client"

import { motion } from "framer-motion"
import { PlayCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Section, SectionHeading } from "@/components/ui/section"

export default function DemoSection() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Demo"
        title="See it in action"
        description="Watch the AI-assisted annotation workflow end to end."
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl"
      >
        <Card className="overflow-hidden p-0 shadow-2xl shadow-primary/10">
          <div className="aspect-video w-full bg-muted">
            <iframe
              src="https://www.youtube.com/embed/uYJQIKAVBw8"
              title={`${"Vailabel Studio"} demo`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <PlayCircle className="h-4 w-4 text-primary" />
            AI-assisted annotation workflow
          </div>
        </Card>
      </motion.div>
    </Section>
  )
}
