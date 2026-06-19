"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import {
  Square, Hexagon, Spline, MousePointer2, Sparkles, Circle, Minus,
  Wand2, ImageIcon, FileText, Music, Video, Tag, AlignLeft, Mic, Film,
  Zap, Cpu, Play, Check, Layers, ScanSearch, ChevronRight,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "image" | "text" | "audio" | "video"

const TABS = [
  { id: "image" as TabId, icon: ImageIcon, label: "Image", file: "street-image.jpg"      },
  { id: "text"  as TabId, icon: FileText,  label: "Text",  file: "ner-corpus.txt"       },
  { id: "audio" as TabId, icon: Music,     label: "Audio", file: "interview.wav"        },
  { id: "video" as TabId, icon: Video,     label: "Video", file: "forklift-warehouse.mp4" },
]

const TOOLS: Record<TabId, React.ElementType[]> = {
  image: [Square, Hexagon, Spline, Circle, Minus, MousePointer2, ScanSearch],
  text:  [Tag, AlignLeft, MousePointer2, Minus, Square, Hexagon, ScanSearch],
  audio: [Mic, Minus, Square, MousePointer2, Circle, Spline, ScanSearch],
  video: [Film, Square, MousePointer2, Spline, Circle, Minus, ScanSearch],
}

// ── Image tab data ─────────────────────────────────────────────────────────────

const IMG_BOXES = [
  // Silver SUV – left foreground (selected)
  { x: 0,  y: 54, w: 23, h: 38, label: "car",           color: "#10b981", conf: 0.97, sel: true  },
  // Two cyclists in center foreground
  { x: 36, y: 57, w: 16, h: 40, label: "person",        color: "#6366f1", conf: 0.96, sel: false },
  { x: 51, y: 60, w: 12, h: 36, label: "person",        color: "#6366f1", conf: 0.94, sel: false },
  // Cars in traffic queue
  { x: 16, y: 38, w: 22, h: 22, label: "car",           color: "#10b981", conf: 0.91, sel: false },
  // White van/truck in center background
  { x: 37, y: 22, w: 17, h: 30, label: "truck",         color: "#f59e0b", conf: 0.88, sel: false },
  // Green bus on the right
  { x: 69, y: 12, w: 31, h: 65, label: "bus",           color: "#ec4899", conf: 0.99, sel: false },
  // Traffic light in distant background
  { x: 57, y: 5,  w: 5,  h: 18, label: "traffic light", color: "#8b5cf6", conf: 0.82, sel: false },
]
const SAM_POLY = "0,54 10,52 22,53 23,65 23,90 16,93 4,93 0,86"
const IMG_LABELS = [
  { name: "person",        count: 3,  color: "#6366f1" },
  { name: "car",           count: 5,  color: "#10b981" },
  { name: "truck",         count: 1,  color: "#f59e0b" },
  { name: "bus",           count: 1,  color: "#ec4899" },
  { name: "traffic light", count: 2,  color: "#8b5cf6" },
]

// ── Text tab data ──────────────────────────────────────────────────────────────

const NER_TOKENS = [
  { text: "In ",        span: null },
  { text: "2024",       span: { type: "DATE",   color: "#ec4899", conf: "0.97" } },
  { text: ", ",         span: null },
  { text: "Apple Inc.", span: { type: "ORG",    color: "#6366f1", conf: "0.99" } },
  { text: " CEO ",      span: null },
  { text: "Tim Cook",   span: { type: "PERSON", color: "#10b981", conf: "0.98" } },
  { text: " unveiled a new campus in ", span: null },
  { text: "Cupertino",  span: { type: "LOC",    color: "#f59e0b", conf: "0.96" } },
  { text: ".",          span: null },
]
const NER_LABELS = [
  { name: "ORG",    count: 8,  color: "#6366f1" },
  { name: "PERSON", count: 12, color: "#10b981" },
  { name: "LOC",    count: 6,  color: "#f59e0b" },
  { name: "DATE",   count: 4,  color: "#ec4899" },
]

// ── Audio tab data ─────────────────────────────────────────────────────────────

const AUDIO_REGIONS = [
  { start: 5,  end: 28,  label: "Speaker A", color: "#6366f1" },
  { start: 30, end: 55,  label: "Speaker B", color: "#10b981" },
  { start: 58, end: 72,  label: "Speaker A", color: "#6366f1" },
  { start: 75, end: 90,  label: "Noise",     color: "#f59e0b" },
]
const AUDIO_LABELS = [
  { name: "Speaker A", count: 7,  color: "#6366f1" },
  { name: "Speaker B", count: 5,  color: "#10b981" },
  { name: "Noise",     count: 3,  color: "#f59e0b" },
  { name: "Silence",   count: 2,  color: "#ec4899" },
]

// ── Video tab data ─────────────────────────────────────────────────────────────

const VIDEO_BOXES = [
  // Worker standing on the left
  { x: "2%",  y: "5%",  w: "17%", h: "88%", label: "person",   color: "#6366f1", conf: 0.98 },
  // Orange Toyota forklift (main object, center)
  { x: "28%", y: "2%",  w: "58%", h: "93%", label: "forklift", color: "#f59e0b", conf: 0.99 },
  // Operator seated on forklift
  { x: "45%", y: "2%",  w: "24%", h: "55%", label: "person",   color: "#6366f1", conf: 0.95 },
]
const VIDEO_LABELS = [
  { name: "forklift", count: 1, color: "#f59e0b" },
  { name: "person",   count: 2, color: "#6366f1" },
  { name: "pallet",   count: 3, color: "#10b981" },
]
const FRAMES = ["#f59e0b","#6366f1","#f59e0b","#6366f1","#f59e0b","#10b981","#f59e0b","#6366f1","#f59e0b","#f59e0b","#6366f1","#f59e0b"]

// ── Image canvas ───────────────────────────────────────────────────────────────

function ImageCanvas() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
      {/* Real photo */}
      <img
        src="/street-image.jpg"
        alt="Street scene"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        draggable={false}
      />
      {/* Subtle overlay so annotations pop */}
      <div className="pointer-events-none absolute inset-0 bg-black/25" />

      {/* SVG annotations */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* SAM polygon for selected car */}
        <motion.polygon
          points={SAM_POLY}
          fill="#10b98115"
          stroke="#10b981"
          strokeWidth="0.4"
          strokeDasharray="1.8 0.9"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        />
        {/* Bboxes */}
        {IMG_BOXES.map((b, i) => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.12 }}>
            <rect
              x={b.x} y={b.y} width={b.w} height={b.h}
              fill={`${b.color}13`} stroke={b.color}
              strokeWidth={b.sel ? 0.55 : 0.4} rx={0.8}
            />
            {/* Resize handles on selected box */}
            {b.sel && [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([cx, cy], hi) => (
              <rect key={hi} x={cx - 0.9} y={cy - 0.9} width={1.8} height={1.8}
                fill="white" stroke={b.color} strokeWidth={0.25} rx={0.3} />
            ))}
          </motion.g>
        ))}
      </svg>

      {/* Label chips + confidence badges */}
      {IMG_BOXES.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + i * 0.12 }}
          className="absolute flex items-center gap-1"
          style={{ left: `${b.x}%`, top: `calc(${b.y}% - 22px)` }}
        >
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: b.color }}>
            {b.label}
          </span>
          <span className="rounded bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">
            {b.conf}
          </span>
        </motion.div>
      ))}

      {/* Status chip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm"
      >
        <Check className="h-3 w-3 text-emerald-500" />
        <span>12 objects · avg 0.93 conf</span>
      </motion.div>
    </div>
  )
}

// ── Image right panel: Labels + Auto-label + Copilot ──────────────────────────

function ImagePanel() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600)
    const t2 = setTimeout(() => setStage(2), 1800)
    const t3 = setTimeout(() => setStage(3), 3200)
    const t4 = setTimeout(() => setStage(4), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      {/* Labels */}
      <div className="p-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Annotations · 12
        </p>
        <div className="space-y-1">
          {IMG_LABELS.map(l => (
            <div key={l.name} className="flex items-center justify-between rounded-lg bg-background/60 px-2 py-1.5 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{l.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-label */}
      <motion.div
        className="p-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Auto-label</span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">YOLOv8n</span>
          <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
            <Cpu className="h-2.5 w-2.5" />GPU
          </span>
        </div>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">conf</span>
          <div className="relative h-1 flex-1 rounded-full bg-muted">
            <div className="absolute left-0 top-0 h-full w-1/4 rounded-full bg-primary" />
            <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow" style={{ left: "calc(25% - 5px)" }} />
          </div>
          <span className="text-[10px] font-medium">0.25</span>
        </div>

        <AnimatePresence mode="wait">
          {stage === 1 && (
            <motion.button
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              <Play className="h-3 w-3" /> Run Auto-label
            </motion.button>
          )}
          {stage === 2 && (
            <motion.div
              key="running"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary/80 px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                className="h-3 w-3 rounded-full border-2 border-white/25 border-t-white"
              />
              Detecting…
            </motion.div>
          )}
          {stage >= 3 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <Check className="h-3 w-3" />
              9 objects detected · 0.87 avg
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Copilot chat */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1.5 p-2.5"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <Wand2 className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Copilot</span>
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            {[
              { from: "user", text: "Detect all vehicles" },
              { from: "ai",   text: "Found 9 objects — added as predictions." },
              { from: "user", text: "What did I miss?" },
              { from: "ai",   text: "2 people near left edge — accept?" },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: m.from === "user" ? 6 : -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`max-w-full rounded-lg px-2 py-1 text-[10px] leading-relaxed ${
                  m.from === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-muted text-foreground"
                }`}
              >
                {m.text}
              </motion.div>
            ))}
            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 text-[10px] text-muted-foreground">
              Ask copilot…
              <ChevronRight className="ml-auto h-3 w-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Text canvas ────────────────────────────────────────────────────────────────

const NER_PARAS = [
  [
    { text: "In ",        span: null },
    { text: "2024",       span: { type: "DATE",   color: "#ec4899" } },
    { text: ", ",         span: null },
    { text: "Apple Inc.", span: { type: "ORG",    color: "#6366f1" } },
    { text: " CEO ",      span: null },
    { text: "Tim Cook",   span: { type: "PERSON", color: "#10b981" } },
    { text: " unveiled a new campus in ", span: null },
    { text: "Cupertino",  span: { type: "LOC",    color: "#f59e0b" } },
    { text: ", expanding the company's presence in ", span: null },
    { text: "Silicon Valley", span: { type: "LOC", color: "#f59e0b" } },
    { text: ".", span: null },
  ],
  [
    { text: "Goldman Sachs", span: { type: "ORG",    color: "#6366f1" } },
    { text: " analysts noted that ",        span: null },
    { text: "Apple",        span: { type: "ORG",    color: "#6366f1" } },
    { text: "'s stock rose 12% after the ", span: null },
    { text: "September 12", span: { type: "DATE",   color: "#ec4899" } },
    { text: " announcement, with ",         span: null },
    { text: "Luca Maestri", span: { type: "PERSON", color: "#10b981" } },
    { text: " citing record services revenue.", span: null },
  ],
]

const NER_ENTITY_TYPES = [
  { type: "ORG",    color: "#6366f1", count: 8  },
  { type: "PERSON", color: "#10b981", count: 12 },
  { type: "LOC",    color: "#f59e0b", count: 6  },
  { type: "DATE",   color: "#ec4899", count: 4  },
]

function Span({ text, color, type, delay }: { text: string; color: string; type: string; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="inline-flex items-baseline gap-px mx-px"
    >
      <mark
        className="rounded-sm px-1 py-px text-[13px] leading-6"
        style={{ backgroundColor: `${color}28`, color: "inherit", textDecoration: `underline 2px ${color}` }}
      >
        {text}
      </mark>
      <span
        className="rounded px-1 py-px text-[9px] font-bold text-white leading-none self-start mt-1"
        style={{ backgroundColor: color }}
      >
        {type}
      </span>
    </motion.span>
  )
}

function TextCanvas() {
  return (
    <div className="relative flex aspect-[16/10] flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <span className="text-[11px] font-medium text-muted-foreground">article.txt</span>
        <span className="text-[11px] text-muted-foreground/50">·  paragraph 3 of 12</span>
        <div className="ml-auto flex items-center gap-1">
          {NER_ENTITY_TYPES.map(e => (
            <span key={e.type} className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: e.color }}>
              {e.type}
            </span>
          ))}
        </div>
      </div>

      {/* Document body */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {NER_PARAS.map((para, pi) => (
          <motion.p
            key={pi}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: pi === 0 ? 1 : 0.55 }}
            transition={{ delay: 0.05 + pi * 0.4 }}
            className="mb-4 text-[13px] leading-8 text-foreground"
          >
            {para.map((tok, ti) =>
              tok.span ? (
                <Span key={ti} text={tok.text} color={tok.span.color} type={tok.span.type} delay={0.15 + pi * 0.4 + ti * 0.06} />
              ) : (
                <span key={ti}>{tok.text}</span>
              )
            )}
          </motion.p>
        ))}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ delay: 1.0 }}
          className="text-[13px] leading-7 text-foreground"
        >
          The company also announced partnerships with several universities in{" "}
          <span style={{ textDecoration: "underline 2px #f59e0b", backgroundColor: "#f59e0b28" }} className="rounded-sm px-1">
            Europe
          </span>
          <span className="mx-px rounded px-1 text-[9px] font-bold text-white" style={{ backgroundColor: "#f59e0b" }}>LOC</span>
          {" "}and plans to hire 2,000 engineers by{" "}
          <span style={{ textDecoration: "underline 2px #ec4899", backgroundColor: "#ec489928" }} className="rounded-sm px-1">
            Q2 2025
          </span>
          <span className="mx-px rounded px-1 text-[9px] font-bold text-white" style={{ backgroundColor: "#ec4899" }}>DATE</span>
          .
        </motion.p>
      </div>

      {/* Footer — entity counts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex shrink-0 items-center gap-4 border-t border-border bg-muted/20 px-4 py-2"
      >
        {NER_ENTITY_TYPES.map(e => (
          <span key={e.type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
            {e.type} · <strong className="text-foreground">{e.count}</strong>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-primary">
          <Wand2 className="h-3 w-3" /> 30 auto-tagged
        </span>
      </motion.div>
    </div>
  )
}

// ── Audio canvas ───────────────────────────────────────────────────────────────

const audioBars = Array.from({ length: 80 }, (_, i) => {
  const t = i / 80
  return 20 + 55 * Math.abs(Math.sin(t * 18) * Math.cos(t * 7) * Math.sin(t * 3 + 1))
})

function AudioCanvas() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2 text-[11px] text-slate-400">
        interview.wav · 0:00 / 1:32 · 2 speakers detected
      </motion.p>
      <div className="relative flex h-20 items-center gap-px">
        {audioBars.map((h, i) => {
          const pct = (i / audioBars.length) * 100
          const reg = AUDIO_REGIONS.find(r => pct >= r.start && pct <= r.end)
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.04 + i * 0.005, duration: 0.15 }}
              className="flex-1 origin-center rounded-sm"
              style={{ height: `${h}%`, backgroundColor: reg ? reg.color : "#475569", opacity: reg ? 0.8 : 0.28 }}
            />
          )
        })}
        <motion.div
          className="absolute top-0 bottom-0 w-px bg-white/60"
          initial={{ left: "0%" }}
          animate={{ left: "38%" }}
          transition={{ duration: 3, delay: 0.6, ease: "linear" }}
        />
      </div>
      <div className="relative mt-1.5 h-5">
        {AUDIO_REGIONS.map((r, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="absolute rounded px-1.5 text-[9px] font-semibold text-white"
            style={{ left: `${r.start}%`, width: `${r.end - r.start}%`, backgroundColor: r.color, paddingTop: 2, paddingBottom: 2 }}
          >
            {r.label}
          </motion.span>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
        className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2.5"
      >
        <p className="mb-1 text-[10px] text-slate-500">Transcription · Speaker A</p>
        <p className="text-[11px] leading-relaxed text-slate-300">
          "…so the key insight was to separate the inference pipeline from the training loop, which reduced latency by…"
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
        className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
      >
        <Check className="h-3 w-3 text-emerald-400" />
        <span>Diarization complete · 17 regions</span>
      </motion.div>
    </div>
  )
}

// ── Video canvas ───────────────────────────────────────────────────────────────

function VideoCanvas() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900 flex flex-col">
      <div className="relative flex-1">
        {/* Real forklift warehouse photo */}
        <img
          src="/forklift.webp"
          alt="Forklift warehouse"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
        <svg className="absolute inset-0 h-full w-full">
          {VIDEO_BOXES.map((b, i) => (
            <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.2 }}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={b.color} strokeWidth="2" strokeDasharray="6 3" rx="3" />
            </motion.g>
          ))}
        </svg>
        {VIDEO_BOXES.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.2 }}
            className="absolute flex items-center gap-1"
            style={{ left: b.x, top: `calc(${b.y} + 4px)` }}
          >
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: b.color }}>
              {b.label}
            </span>
            <span className="rounded bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">
              {b.conf}
            </span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
          className="absolute left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur"
          style={{ bottom: "0.6rem" }}
        >
          <Layers className="h-3 w-3 text-amber-400" />
          Tracking 3 objects · 124 frames
        </motion.div>
      </div>
      <div className="border-t border-white/10 bg-black/50 px-3 py-2">
        <div className="mb-1 flex items-center gap-0.5">
          {FRAMES.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.03 }}
              className="flex-1 rounded-sm"
              style={{ height: 20, backgroundColor: i === 4 ? c : `${c}30`, border: i === 4 ? `1px solid ${c}` : "1px solid transparent" }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>0:00</span>
          <span className="font-medium text-white">Frame 12 / 124</span>
          <span>0:05</span>
        </div>
      </div>
    </div>
  )
}

// ── Shared label panel for text / audio / video ────────────────────────────────

function SimplePanel({
  labels,
  copilot,
}: {
  labels: { name: string; count: number; color: string }[]
  copilot: string
}) {
  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      <div className="p-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Labels</p>
        <div className="space-y-1">
          {labels.map(l => (
            <div key={l.name} className="flex items-center justify-between rounded-lg bg-background/60 px-2 py-1.5 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{l.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <Wand2 className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Copilot</span>
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{copilot}</p>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2 py-1.5 text-[10px] text-muted-foreground">
          Ask copilot… <ChevronRight className="ml-auto h-3 w-3" />
        </div>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export function HeroMockup() {
  const [active, setActive] = useState<TabId>("image")

  useEffect(() => {
    const order: TabId[] = ["image", "text", "audio", "video"]
    let idx = 0
    const id = setInterval(() => {
      idx = (idx + 1) % order.length
      setActive(order[idx])
    }, 6000)
    return () => clearInterval(id)
  }, [])

  const tab = TABS.find(t => t.id === active)!
  const tools = TOOLS[active]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative mx-auto mt-16 w-full max-w-5xl"
    >
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 bg-glow blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 ring-1 ring-black/5">

        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <AnimatePresence mode="wait">
              <motion.span
                key={tab.file}
                initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
              >
                Vailabel Studio · {tab.file}
              </motion.span>
            </AnimatePresence>
          </div>
          {/* Mode tabs */}
          <div className="flex items-center gap-1">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    active === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Tool rail */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-muted/30 py-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                {tools.map((Icon, i) => (
                  <div
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`canvas-${active}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                {active === "image" && <ImageCanvas />}
                {active === "text"  && <TextCanvas />}
                {active === "audio" && <AudioCanvas />}
                {active === "video" && <VideoCanvas />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right panel */}
          <div className="hidden w-52 shrink-0 flex-col border-l border-border bg-muted/20 sm:flex">
            <AnimatePresence mode="wait">
              <motion.div
                key={`panel-${active}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                {active === "image" && <ImagePanel />}
                {active === "text"  && <SimplePanel labels={NER_LABELS} copilot='"Tag all dates" → 8 spans added' />}
                {active === "audio" && <SimplePanel labels={AUDIO_LABELS} copilot='"Transcribe Speaker A" → text extracted' />}
                {active === "video" && <SimplePanel labels={VIDEO_LABELS} copilot='"Track the forklift" → 124 frames annotated' />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
