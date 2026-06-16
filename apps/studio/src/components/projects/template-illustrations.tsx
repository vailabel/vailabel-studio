import type { ReactNode } from "react"
import type { LabelingTemplate } from "@/lib/labeling-templates"

// Vector "preview images" for the template gallery — one illustration per
// labeling task (Label Studio ships screenshots; we draw the task instead).
// Flat, fixed colors so they read on both light and dark card headers; no
// gradients/ids (avoids duplicate-id collisions when many render at once).

const C = {
  canvas: "#cdd9ec",
  ground: "#bfe3c9",
  sun: "#fde68a",
  doc: "#f8fafc",
  line: "#cbd5e1",
  audio: "#1f2937",
  wave: "#34d399",
  blue: "#3b82f6",
  orange: "#f97316",
  green: "#10b981",
  purple: "#8b5cf6",
  pink: "#ec4899",
  amber: "#f59e0b",
  red: "#ef4444",
  slate: "#64748b",
  white: "#ffffff",
}

// ── primitives ───────────────────────────────────────────────────────────────
const panel = (fill: string) => (
  <rect x={0} y={0} width={120} height={90} fill={fill} />
)
const row = (x: number, y: number, w: number, fill = C.line, h = 5) => (
  <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />
)
const box = (x: number, y: number, w: number, h: number, stroke: string) => (
  <rect x={x} y={y} width={w} height={h} rx={1.5} fill="none" stroke={stroke} strokeWidth={2.5} />
)
const tag = (x: number, y: number, w: number, fill: string) => (
  <rect x={x} y={y} width={w} height={6} rx={1} fill={fill} />
)
const chip = (x: number, y: number, w: number, fill: string) => (
  <rect x={x} y={y} width={w} height={10} rx={5} fill={fill} />
)
const hl = (x: number, y: number, w: number, fill: string) => (
  <rect x={x} y={y - 1} width={w} height={7} rx={1.5} fill={fill} opacity={0.45} />
)

// A simple "photo" scene reused by image illustrations.
const photo = () => (
  <>
    {panel(C.canvas)}
    <rect x={0} y={56} width={120} height={34} fill={C.ground} />
    <circle cx={96} cy={24} r={9} fill={C.sun} />
  </>
)
const doc = () => (
  <>
    {panel(C.doc)}
    {row(14, 16, 92)}
    {row(14, 28, 80)}
    {row(14, 40, 88)}
    {row(14, 52, 70)}
    {row(14, 64, 84)}
  </>
)
const wave = () => {
  const bars: ReactNode[] = []
  for (let i = 0; i < 26; i++) {
    const h = 8 + Math.abs(Math.sin(i * 0.9)) * 30
    bars.push(
      <rect key={i} x={8 + i * 4.1} y={45 - h / 2} width={2.4} height={h} rx={1.2} fill={C.wave} />
    )
  }
  return (
    <>
      {panel(C.audio)}
      {bars}
    </>
  )
}

// ── illustrations (return SVG children) ──────────────────────────────────────
const ART: Record<string, () => ReactNode> = {
  // Computer Vision
  "object-detection": () => (
    <>
      {photo()}
      {box(16, 30, 40, 40, C.blue)}
      {tag(16, 24, 22, C.blue)}
      {box(66, 40, 34, 30, C.orange)}
      {tag(66, 34, 18, C.orange)}
    </>
  ),
  "semantic-segmentation": () => (
    <>
      {photo()}
      <polygon
        points="20,64 30,34 52,28 70,44 64,68"
        fill={C.purple}
        opacity={0.4}
        stroke={C.purple}
        strokeWidth={2}
      />
      <polygon points="76,66 86,46 104,54 100,70" fill={C.orange} opacity={0.4} stroke={C.orange} strokeWidth={2} />
    </>
  ),
  "brush-segmentation": () => (
    <>
      {photo()}
      <path d="M24 60 q6 -26 26 -24 q22 2 16 26 q-4 16 -24 14 q-22 -2 -18 -16Z" fill={C.pink} opacity={0.5} />
      <circle cx={86} cy={58} r={14} fill={C.blue} opacity={0.45} />
    </>
  ),
  keypoints: () => (
    <>
      {photo()}
      <polyline
        points="60,24 60,46 44,60 60,46 78,60 60,34 48,40 72,40"
        fill="none"
        stroke={C.blue}
        strokeWidth={2}
      />
      {[
        [60, 24],
        [60, 46],
        [44, 60],
        [78, 60],
        [48, 40],
        [72, 40],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.4} fill={C.orange} stroke={C.white} strokeWidth={1} />
      ))}
    </>
  ),
  mixed: () => (
    <>
      {photo()}
      {box(14, 30, 32, 34, C.blue)}
      <polygon points="58,62 66,40 84,46 80,64" fill={C.green} opacity={0.4} stroke={C.green} strokeWidth={2} />
      <circle cx={98} cy={34} r={3.5} fill={C.orange} />
    </>
  ),
  ellipse: () => (
    <>
      {photo()}
      <ellipse cx={54} cy={48} rx={30} ry={20} fill="none" stroke={C.blue} strokeWidth={2.5} />
    </>
  ),
  ocr: () => (
    <>
      {photo()}
      <rect x={16} y={28} width={88} height={36} rx={2} fill={C.white} opacity={0.85} />
      {box(20, 32, 60, 9, C.blue)}
      {box(20, 46, 76, 9, C.orange)}
    </>
  ),
  "image-captioning": () => (
    <>
      {photo()}
      <rect x={10} y={66} width={100} height={16} rx={3} fill={C.white} opacity={0.9} />
      {row(16, 71, 70, C.slate, 3)}
      {row(16, 76, 50, C.slate, 3)}
    </>
  ),
  "image-classification": () => (
    <>
      {photo()}
      {chip(12, 70, 30, C.blue)}
      {chip(46, 70, 26, C.slate)}
      {chip(76, 70, 30, C.slate)}
    </>
  ),
  "visual-qa": () => (
    <>
      {photo()}
      <rect x={66} y={20} width={42} height={26} rx={6} fill={C.white} opacity={0.92} />
      <text x={87} y={40} fontSize={20} fontWeight={700} fill={C.blue} textAnchor="middle">
        ?
      </text>
    </>
  ),

  // Video
  "video-classification": () => (
    <>
      {panel(C.canvas)}
      <rect x={0} y={56} width={120} height={34} fill={C.ground} />
      <polygon points="50,30 50,52 70,41" fill={C.white} opacity={0.9} />
      {chip(14, 70, 30, C.blue)}
      {chip(48, 70, 28, C.slate)}
    </>
  ),
  "video-tracking": () => (
    <>
      {photo()}
      {box(40, 28, 34, 32, C.blue)}
      <line x1={20} y1={74} x2={100} y2={74} stroke={C.slate} strokeWidth={3} strokeLinecap="round" />
      <circle cx={56} cy={74} r={4} fill={C.orange} />
    </>
  ),
  "video-timeline": () => (
    <>
      {panel(C.canvas)}
      <rect x={0} y={50} width={120} height={40} fill={C.audio} />
      {tag(10, 62, 30, C.blue)}
      {tag(46, 62, 22, C.orange)}
      {tag(74, 62, 34, C.green)}
      <line x1={62} y1={54} x2={62} y2={86} stroke={C.white} strokeWidth={1.5} />
    </>
  ),

  // Natural Language
  ner: () => (
    <>
      {doc()}
      {hl(14, 16, 30, C.blue)}
      {hl(60, 28, 24, C.green)}
      {hl(14, 52, 20, C.orange)}
    </>
  ),
  "text-classification": () => (
    <>
      {doc()}
      {chip(14, 72, 28, C.blue)}
      {chip(46, 72, 22, C.slate)}
      {chip(72, 72, 26, C.slate)}
    </>
  ),
  taxonomy: () => (
    <>
      {doc()}
      {chip(14, 64, 24, C.blue)}
      {chip(42, 64, 20, C.purple)}
      {chip(66, 64, 26, C.green)}
      {chip(26, 78, 22, C.slate)}
    </>
  ),
  "relation-extraction": () => (
    <>
      {doc()}
      {hl(14, 28, 22, C.blue)}
      {hl(72, 28, 22, C.orange)}
      <path d="M30 26 q22 -14 48 0" fill="none" stroke={C.purple} strokeWidth={2} />
      <polygon points="78,26 72,22 73,30" fill={C.purple} />
    </>
  ),
  "question-answering": () => (
    <>
      {panel(C.doc)}
      <text x={12} y={23} fontSize={11} fontWeight={700} fill={C.blue}>
        Q
      </text>
      {row(26, 18, 80)}
      {row(14, 38, 92)}
      {hl(14, 50, 44, C.green)}
      {row(62, 50, 44)}
      {row(14, 64, 78)}
    </>
  ),
  translation: () => (
    <>
      {panel(C.doc)}
      {row(12, 22, 38)}
      {row(12, 34, 30)}
      {row(12, 46, 36)}
      <text x={60} y={48} fontSize={16} fill={C.blue} textAnchor="middle">
        →
      </text>
      {row(72, 22, 36, C.blue)}
      {row(72, 34, 28, C.blue)}
      {row(72, 46, 34, C.blue)}
    </>
  ),

  // Audio & Speech
  "audio-classification": () => (
    <>
      {wave()}
      {chip(10, 70, 30, C.blue)}
      {chip(44, 70, 26, C.slate)}
      {chip(74, 70, 30, C.slate)}
    </>
  ),
  asr: () => (
    <>
      {wave()}
      <rect x={10} y={66} width={100} height={16} rx={3} fill={C.white} opacity={0.92} />
      {row(16, 71, 80, C.slate, 3)}
      {row(16, 76, 56, C.line, 3)}
    </>
  ),
  "speaker-segmentation": () => (
    <>
      {wave()}
      <rect x={8} y={66} width={46} height={12} rx={3} fill={C.blue} opacity={0.5} />
      <rect x={58} y={66} width={54} height={12} rx={3} fill={C.orange} opacity={0.5} />
    </>
  ),

  // Conversational AI
  "intent-slot": () => (
    <>
      {doc()}
      {hl(14, 16, 26, C.blue)}
      {hl(50, 16, 30, C.green)}
      {chip(14, 72, 30, C.purple)}
    </>
  ),
  "response-generation": () => (
    <>
      {panel(C.doc)}
      <rect x={12} y={16} width={64} height={18} rx={9} fill={C.line} />
      <rect x={44} y={42} width={64} height={18} rx={9} fill={C.blue} />
      <rect x={12} y={68} width={50} height={16} rx={8} fill={C.line} />
    </>
  ),

  // Ranking & Scoring
  pairwise: () => (
    <>
      {panel(C.doc)}
      <rect x={12} y={20} width={40} height={50} rx={4} fill={C.blue} opacity={0.5} />
      <rect x={68} y={20} width={40} height={50} rx={4} fill={C.line} />
      <text x={60} y={50} fontSize={11} fontWeight={700} fill={C.slate} textAnchor="middle">
        vs
      </text>
    </>
  ),
  "document-retrieval": () => (
    <>
      {panel(C.doc)}
      <circle cx={20} cy={22} r={4} fill={C.blue} />
      {row(30, 20, 76)}
      <circle cx={20} cy={44} r={4} fill={C.slate} />
      {row(30, 42, 64)}
      <circle cx={20} cy={66} r={4} fill={C.slate} />
      {row(30, 64, 70)}
    </>
  ),
  "search-ranking": () => (
    <>
      {panel(C.doc)}
      {row(14, 18, 90, C.blue)}
      {row(14, 34, 78)}
      {row(14, 50, 84)}
      {row(14, 66, 70)}
    </>
  ),

  // Structured Data
  "html-ner": () => (
    <>
      {panel(C.doc)}
      <text x={12} y={26} fontSize={11} fontWeight={700} fill={C.slate} fontFamily="monospace">
        &lt;/&gt;
      </text>
      {row(40, 18, 64)}
      {hl(40, 34, 40, C.blue)}
      {row(40, 50, 56)}
    </>
  ),
  tabular: () => (
    <>
      {panel(C.doc)}
      {[20, 38, 56, 74].map((y) => (
        <line key={y} x1={8} y1={y} x2={112} y2={y} stroke={C.line} strokeWidth={1.5} />
      ))}
      {[42, 76].map((x) => (
        <line key={x} x1={x} y1={14} x2={x} y2={80} stroke={C.line} strokeWidth={1.5} />
      ))}
      <rect x={8} y={38} width={34} height={18} fill={C.blue} opacity={0.4} />
    </>
  ),

  // Time Series
  "timeseries-labeling": () => (
    <>
      {panel(C.doc)}
      <rect x={44} y={14} width={28} height={64} fill={C.blue} opacity={0.18} />
      <polyline
        points="8,60 24,40 38,52 54,24 70,44 86,30 112,50"
        fill="none"
        stroke={C.blue}
        strokeWidth={2.5}
      />
    </>
  ),
  "change-point": () => (
    <>
      {panel(C.doc)}
      <polyline points="8,64 30,58 52,60 60,30 84,28 112,32" fill="none" stroke={C.green} strokeWidth={2.5} />
      <line x1={58} y1={14} x2={58} y2={80} stroke={C.red} strokeWidth={2} strokeDasharray="4 3" />
    </>
  ),

  // Generative AI / LLM
  rlhf: () => (
    <>
      {panel(C.doc)}
      <rect x={12} y={18} width={42} height={40} rx={4} fill={C.blue} opacity={0.45} />
      <rect x={66} y={18} width={42} height={40} rx={4} fill={C.line} />
      <text x={33} y={78} fontSize={14} fill={C.amber} textAnchor="middle">
        ★
      </text>
      <text x={87} y={78} fontSize={14} fill={C.slate} textAnchor="middle">
        ☆
      </text>
    </>
  ),
  "chatbot-assessment": () => (
    <>
      {panel(C.doc)}
      <rect x={12} y={16} width={58} height={16} rx={8} fill={C.line} />
      <rect x={50} y={38} width={58} height={16} rx={8} fill={C.blue} />
      {[28, 40, 52, 64, 76].map((x) => (
        <text key={x} x={x} y={78} fontSize={12} fill={C.amber} textAnchor="middle">
          ★
        </text>
      ))}
    </>
  ),

  // Custom
  custom: () => (
    <>
      {panel(C.doc)}
      <rect x={12} y={14} width={48} height={62} rx={4} fill={C.canvas} />
      {box(18, 22, 36, 22, C.blue)}
      {chip(18, 52, 36, C.orange)}
      {row(70, 18, 38, C.slate, 4)}
      {row(70, 30, 30, C.line, 4)}
      {row(70, 42, 36, C.line, 4)}
      {row(70, 54, 24, C.line, 4)}
    </>
  ),
}

// Aliases: newer templates reuse the illustration of the task they share.
ART["text-summarization"] = ART.translation
ART["content-moderation"] = ART["text-classification"]
ART["asr-segments"] = ART.asr
ART["sound-event-detection"] = ART["audio-classification"]
ART["voice-activity-detection"] = ART["speaker-segmentation"]

interface TemplateIllustrationProps {
  template: LabelingTemplate
  className?: string
}

export function TemplateIllustration({
  template,
  className,
}: TemplateIllustrationProps) {
  const render = ART[template.id]
  if (!render) {
    const Icon = template.icon
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center">
          <Icon className="size-10 text-muted-foreground/70" />
        </div>
      </div>
    )
  }
  return (
    <svg
      viewBox="0 0 120 90"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${template.label} preview`}
    >
      {render()}
    </svg>
  )
}
