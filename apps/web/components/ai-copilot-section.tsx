"use client"

import { motion } from "framer-motion"
import {
  ScanSearch,
  Lasso,
  Tags,
  ClipboardCheck,
  Wand2,
  Cpu,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Section, SectionHeading } from "@/components/ui/section"

const capabilities: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ScanSearch,
    title: "Detect",
    desc: "“Find all the cars” → bounding boxes from a local YOLO model.",
  },
  {
    icon: Lasso,
    title: "Segment",
    desc: "Click an object → a clean polygon mask via MobileSAM.",
  },
  {
    icon: Tags,
    title: "Suggest labels",
    desc: "“What should I label here?” → one-click label chips.",
  },
  {
    icon: ClipboardCheck,
    title: "QA review",
    desc: "“What did I miss?” → findings you approve or reject.",
  },
]

const chat = [
  { from: "user", text: "Detect all the cars in this image" },
  { from: "ai", text: "Found 9 cars. Added them as predictions to review." },
  { from: "user", text: "What did I miss?" },
  { from: "ai", text: "2 unlabeled people on the left — accept to add them?" },
]

export default function AiCopilotSection() {
  return (
    <Section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <SectionHeading
        eyebrow="AI Copilot"
        title={
          <>
            An AI that <span className="text-gradient">labels with you</span>
          </>
        }
        description="A chat copilot that sees the current image and takes labeling actions — running entirely on-device. It proposes; you approve. Nothing leaves your machine."
      />

      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* capabilities */}
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="h-full p-5">
                  <c.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge variant="outline">
              <Cpu className="h-3.5 w-3.5" /> ONNX Runtime · optional CUDA
            </Badge>
            <Badge variant="outline">Works with LM Studio · Ollama · Jan</Badge>
          </div>

          <Link
            href="/docs/ai-copilot"
            className={buttonVariants({
              variant: "outline",
              className: "mt-6",
            })}
          >
            Read the copilot guide
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* chat mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wand2 className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">AI Copilot</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                On-device
              </span>
            </div>
            <div className="space-y-3 p-4">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.from === "user" ? "flex justify-end" : "flex justify-start"
                  }
                >
                  <div
                    className={
                      m.from === "user"
                        ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                        : "max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-foreground"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                Ask the copilot…
                <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </Section>
  )
}
