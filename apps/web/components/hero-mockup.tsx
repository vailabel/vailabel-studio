"use client"

import { motion } from "framer-motion"
import {
  Square,
  Hexagon,
  Spline,
  MousePointer2,
  Sparkles,
  Circle,
  Minus,
  Wand2,
} from "lucide-react"

const tools = [Square, Hexagon, Spline, Circle, Minus, MousePointer2]

const boxes = [
  { x: "8%", y: "44%", w: "26%", h: "42%", label: "person", color: "#6366f1" },
  { x: "40%", y: "30%", w: "34%", h: "55%", label: "car", color: "#10b981" },
  { x: "70%", y: "20%", w: "22%", h: "30%", label: "traffic light", color: "#f59e0b" },
]

const labels = [
  { name: "person", count: 14, color: "#6366f1" },
  { name: "car", count: 9, color: "#10b981" },
  { name: "traffic light", count: 5, color: "#f59e0b" },
  { name: "bicycle", count: 3, color: "#ec4899" },
]

export function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative mx-auto mt-16 w-full max-w-5xl"
    >
      {/* glow */}
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 bg-glow blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 ring-1 ring-black/5">
        {/* window title bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Vailabel Studio · street-scene.jpg
          </div>
        </div>

        <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[3.25rem_1fr_13rem]">
          {/* tool rail */}
          <div className="flex flex-col items-center gap-1 border-r border-border bg-muted/30 py-3">
            {tools.map((Icon, i) => (
              <div
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>

          {/* canvas */}
          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900">
            <div className="absolute inset-0 bg-grid opacity-40" />
            <svg className="absolute inset-0 h-full w-full">
              {boxes.map((b, i) => (
                <motion.g
                  key={b.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.2 }}
                >
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill={`${b.color}1a`}
                    stroke={b.color}
                    strokeWidth={2}
                    rx={4}
                  />
                </motion.g>
              ))}
            </svg>
            {boxes.map((b, i) => (
              <motion.span
                key={b.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.2 }}
                className="absolute rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow"
                style={{ left: b.x, top: `calc(${b.y} - 18px)`, backgroundColor: b.color }}
              >
                {b.label}
              </motion.span>
            ))}

            {/* AI copilot chip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur"
            >
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              <span>AI copilot detected 4 labels</span>
            </motion.div>
          </div>

          {/* label panel */}
          <div className="hidden flex-col border-l border-border bg-muted/20 p-3 sm:flex">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Labels
            </p>
            <div className="space-y-1.5">
              {labels.map((l) => (
                <div
                  key={l.name}
                  className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1.5 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </span>
                  <span className="text-muted-foreground">{l.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> AI Copilot
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                “Detect all the cars” → 9 boxes added
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
