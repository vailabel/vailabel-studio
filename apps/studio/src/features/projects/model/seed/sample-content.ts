// Sample content for seeded projects. Everything here is pure: text documents,
// HTML pages, time-series CSVs, and byte-accurate WAV / PDF files are built
// from code, so the seeder needs no bundled binaries.

import { encodeDicom } from "@/shared/lib/dicom/write-dicom"
import type { DicomSeries } from "@/shared/lib/dicom/dicom"

export const SAMPLE_TEXTS = [
  "Maria Lopez joined Acme Robotics in Berlin last spring. The company, founded by Daniel Cho, plans to open a second office in Toronto next year.",
  "The city council of Lisbon approved a new tram line on Tuesday. Mayor Ana Ribeiro said construction, led by Metro Norte, should finish by 2028.",
  "I ordered the wireless headphones two weeks ago and they still have not arrived. Support was friendly, but nobody could tell me where the package is.",
]

export const SAMPLE_HTML = [
  `<article>
  <h1>Solar Farm Opens Outside Reno</h1>
  <p><em>By Priya Natarajan</em> · 12 March 2026</p>
  <p>A 200-megawatt solar farm began delivering power to northern Nevada this week. The project, built by <strong>Sierra Renewables</strong>, covers nearly 1,400 acres.</p>
  <h2>What it means</h2>
  <ul>
    <li>Enough electricity for about 45,000 homes</li>
    <li>Roughly 300 construction jobs over two years</li>
  </ul>
  <p>Officials expect a second phase to be approved later this year.</p>
</article>`,
  `<article>
  <h1>Weekend Guide: Three Easy Hikes</h1>
  <p><em>By Tom Okafor</em></p>
  <p>Looking for a short walk with a big view? These trails are under five kilometres and suit beginners.</p>
  <table>
    <tr><th>Trail</th><th>Distance</th><th>Climb</th></tr>
    <tr><td>Heron Loop</td><td>3.2 km</td><td>60 m</td></tr>
    <tr><td>Quarry Ridge</td><td>4.8 km</td><td>210 m</td></tr>
    <tr><td>Mill Creek</td><td>2.5 km</td><td>35 m</td></tr>
  </table>
  <blockquote>Bring water, even on a cool day.</blockquote>
</article>`,
]

const QUERIES = [
  "How do I reset my router to factory settings?",
  "What is the capital of Australia?",
  "Summarize the benefits of regular exercise.",
]

const ANSWERS = [
  [
    "Hold the reset button on the back for ten seconds until the lights blink, then wait two minutes for it to restart.",
    "Canberra is the capital of Australia.",
    "Regular exercise improves heart health, mood and sleep, and lowers the risk of several chronic diseases.",
  ],
  [
    "Unplug the router and plug it back in. That restores every setting to the factory default.",
    "The capital of Australia is Sydney, its largest city.",
    "Exercise is good for you because it is healthy.",
  ],
  [
    "Routers cannot be reset; you need to buy a new one.",
    "Australia's capital is Melbourne.",
    "Exercise mainly helps people become professional athletes.",
  ],
]

const PASSAGES = [
  [
    "Most home routers have a recessed reset button. Pressing it for about ten seconds erases custom settings, including the Wi-Fi name and password.",
    "Canberra was chosen as Australia's capital in 1908 as a compromise between Sydney and Melbourne. Parliament moved there in 1927.",
    "Adults who are active for 150 minutes a week have lower rates of heart disease, type 2 diabetes and depression.",
  ],
  [
    "Restarting a router by unplugging it clears temporary faults but keeps all of your settings.",
    "Sydney is Australia's most populous city and the capital of the state of New South Wales.",
    "Strength training twice a week helps maintain muscle mass and bone density as people age.",
  ],
  [
    "Mesh Wi-Fi systems use several access points to cover larger homes with one network name.",
    "The Great Barrier Reef lies off the coast of Queensland and is visible from space.",
    "A balanced diet includes vegetables, whole grains and enough protein.",
  ],
]

/** Trailing variant of a field name: "response_b" → 1, "document_3" → 2. */
function variantOf(name: string): number {
  const suffix = /[_-]?([a-c]|\d+)$/i.exec(name)?.[1]?.toLowerCase()
  if (!suffix) return 0
  const index = /\d/.test(suffix)
    ? Number(suffix) - 1
    : suffix.charCodeAt(0) - 97
  return Math.max(0, index) % ANSWERS.length
}

/**
 * Plausible text for a row field, chosen from its name so a seeded task reads
 * like the real thing: prompts look like questions, responses like answers
 * (with later variants deliberately worse), documents like passages.
 */
export function sampleFieldText(name: string, row: number): string {
  const field = name.toLowerCase()
  const at = row % QUERIES.length
  if (/prompt|question|query|instruction|input|request/.test(field))
    return QUERIES[at]
  if (
    /response|answer|output|completion|summary|translation|reply|prediction/.test(
      field
    )
  ) {
    return ANSWERS[variantOf(field)][at]
  }
  if (
    /context|document|passage|source|reference|result|evidence|chunk/.test(
      field
    )
  ) {
    return PASSAGES[variantOf(field)][at]
  }
  if (/dialog|conversation|chat|transcript/.test(field)) {
    return `User: ${QUERIES[at]}\nAssistant: ${ANSWERS[0][at]}`
  }
  return SAMPLE_TEXTS[at]
}

/** Rows for a whole-row (tabular) classification task. */
export const SAMPLE_TABLE_ROWS: Array<Record<string, string>> = [
  {
    id: "1001",
    product: "Wireless headphones",
    rating: "5",
    review: "Great sound and the battery lasts all week.",
  },
  {
    id: "1002",
    product: "Standing desk",
    rating: "2",
    review: "Wobbles at full height and the motor is loud.",
  },
  {
    id: "1003",
    product: "Coffee grinder",
    rating: "4",
    review: "Consistent grind, a little messy to clean.",
  },
  {
    id: "1004",
    product: "Desk lamp",
    rating: "1",
    review: "Stopped working after three days.",
  },
]

/**
 * A two-channel signal with a clear regime change two thirds of the way in and
 * one spike — something worth labeling for change-point, anomaly and activity
 * tasks alike. `dated` writes ISO timestamps instead of seconds.
 */
export function sampleTimeSeriesCsv(variant: number, dated = false): string {
  const rows = 240
  const changeAt = Math.round(rows * (0.55 + 0.1 * variant))
  const spikeAt = Math.round(rows * (0.25 + 0.1 * variant))
  const start = Date.UTC(2026, 0, 1)
  const lines = ["time,velocity,temperature"]
  for (let index = 0; index < rows; index++) {
    const base = index < changeAt ? 2 : 6
    const wave = Math.sin(index / (5 + variant)) * 0.8
    const spike = index === spikeAt ? 7 : 0
    const velocity = base + wave + spike
    const temperature =
      20 + Math.sin(index / 40) * 3 + (index >= changeAt ? 2 : 0)
    const time = dated
      ? new Date(start + index * 60_000).toISOString()
      : String(index)
    lines.push(`${time},${velocity.toFixed(3)},${temperature.toFixed(3)}`)
  }
  return `${lines.join("\n")}\n`
}

function base64(bytes: Uint8Array): string {
  let binary = ""
  // Chunked: String.fromCharCode(...bytes) overflows the stack on large inputs.
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

const SAMPLE_RATE = 8000

/**
 * A short mono 16-bit WAV as a data URL: tone bursts separated by silence, so
 * there are obvious "speech" and "non-speech" ranges to segment.
 */
export function sampleWavDataUrl(variant: number, seconds = 3): string {
  const samples = SAMPLE_RATE * seconds
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const ascii = (offset: number, text: string) =>
    [...text].forEach((char, index) =>
      view.setUint8(offset + index, char.charCodeAt(0))
    )

  ascii(0, "RIFF")
  view.setUint32(4, 36 + samples * 2, true)
  ascii(8, "WAVE")
  ascii(12, "fmt ")
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  ascii(36, "data")
  view.setUint32(40, samples * 2, true)

  const burst = SAMPLE_RATE * 0.6
  const gap = SAMPLE_RATE * 0.4
  for (let index = 0; index < samples; index++) {
    const phase = index % (burst + gap)
    const voiced = phase < burst
    const frequency =
      220 + 110 * ((Math.floor(index / (burst + gap)) + variant) % 3)
    // Fade each burst in and out to avoid clicks.
    const envelope = voiced ? Math.sin((Math.PI * phase) / burst) : 0
    const value =
      Math.sin((2 * Math.PI * frequency * index) / SAMPLE_RATE) * envelope
    view.setInt16(44 + index * 2, Math.round(value * 0x5fff), true)
  }
  return `data:audio/wav;base64,${base64(new Uint8Array(buffer))}`
}

const pdfText = (text: string) => text.replace(/[\\()]/g, (char) => `\\${char}`)

/** A valid single-page PDF (ASCII only) with a title and body lines. */
export function samplePdf(title: string, lines: string[]): string {
  const body = [
    "BT",
    "/F1 20 Tf",
    "72 720 Td",
    `(${pdfText(title)}) Tj`,
    "/F1 12 Tf",
    ...lines.flatMap((line) => ["0 -22 Td", `(${pdfText(line)}) Tj`]),
    "ET",
  ].join("\n")

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]

  let pdf = "%PDF-1.4\n"
  const offsets = objects.map((object, index) => {
    const offset = pdf.length
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
    return offset
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return pdf
}

export const SAMPLE_PDFS = [
  samplePdf("Invoice 2026-0142", [
    "Bill to: Northwind Traders, 12 Harbor Street",
    "Item: Annual maintenance plan        1 x 480.00",
    "Item: On-site visit                  2 x  95.00",
    "Total due: 670.00 USD by 30 April 2026",
  ]),
  samplePdf("City Council Minutes", [
    "Meeting of 4 March 2026, called to order at 18:30.",
    "Motion to extend library hours passed 6 to 1.",
    "Budget review postponed to the April session.",
  ]),
]

// ── Structured text fields (Paragraphs / Chat / List objects) ────────────────
/** Support dialogues, Label Studio Paragraphs shape. */
export const SAMPLE_DIALOGUES = [
  [
    { author: "Customer", text: "Hi, my Aero 2 headphones stopped charging yesterday." },
    { author: "Agent", text: "Sorry to hear that! Does the light turn on when you plug them in?" },
    { author: "Customer", text: "No light at all, even with a different cable." },
    { author: "Agent", text: "Thanks. I've started a free replacement under your warranty." },
  ],
  [
    { author: "Customer", text: "I was charged twice for my March subscription." },
    { author: "Agent", text: "I can see the duplicate payment of 12.99 on your account." },
    { author: "Agent", text: "I've refunded it; it should arrive within five business days." },
  ],
  [
    { author: "Customer", text: "How do I cancel my Pro plan before it renews?" },
    { author: "Agent", text: "Go to Settings, then Billing, and choose Cancel plan." },
    { author: "Customer", text: "Done, thank you!" },
  ],
].map((dialogue) => JSON.stringify(dialogue, null, 2))

/** Assistant chats, as {role, content} messages. */
export const SAMPLE_CHATS = [
  [
    { role: "user", content: "Can you help me write a polite reminder about an unpaid invoice?" },
    { role: "assistant", content: "Of course. Here's a short draft: \"Hi Sam, a friendly reminder that invoice 0142 was due on May 3. Could you let me know when we can expect payment? Thanks!\"" },
    { role: "user", content: "Make it a bit firmer." },
    { role: "assistant", content: "\"Hi Sam, invoice 0142 is now two weeks overdue. Please arrange payment by Friday or let me know if there's an issue.\"" },
  ],
  [
    { role: "user", content: "What's the boiling point of water at the top of Everest?" },
    { role: "assistant", content: "Around 70 °C, because the air pressure there is about a third of sea level." },
  ],
  [
    { role: "user", content: "My Python script says ModuleNotFoundError: requests." },
    { role: "assistant", content: "Install it with `pip install requests` in the same environment you run the script from." },
    { role: "user", content: "Still failing." },
    { role: "assistant", content: "Check `python -m pip --version` matches the interpreter in your script's shebang or IDE." },
  ],
].map((chat) => JSON.stringify(chat, null, 2))

/** Search result lists to rank, as {id, title, body} entries. */
export const SAMPLE_LISTS = [
  [
    { id: "r1", title: "How to clean wireless earbuds safely", body: "Use a dry brush and isopropyl wipes; avoid liquids in the mesh." },
    { id: "r2", title: "Best earbuds of the year", body: "Our picks across budgets, tested for sound and battery." },
    { id: "r3", title: "Earbud cases and accessories", body: "Shop silicone covers, ear tips and charging docks." },
  ],
  [
    { id: "r1", title: "Sourdough starter in 7 days", body: "Feed flour and water daily; discard half each time." },
    { id: "r2", title: "Quick yeast bread recipe", body: "Ready in two hours with instant yeast." },
    { id: "r3", title: "History of bread", body: "From ancient Egypt to modern bakeries." },
  ],
  [
    { id: "r1", title: "Reset your router password", body: "Hold the reset button for 10 seconds, then sign in with the default." },
    { id: "r2", title: "Router buying guide", body: "Wi-Fi 6 vs Wi-Fi 7 and what range you need." },
    { id: "r3", title: "Speed up slow Wi-Fi", body: "Move the router, change channels and update firmware." },
  ],
].map((list) => JSON.stringify(list, null, 2))

// ── Point clouds ─────────────────────────────────────────────────────────────
/** Deterministic pseudo-random numbers in [0, 1) (seeded LCG). */
function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

/**
 * A small synthetic LiDAR scan as ASCII PCD (x y z intensity, sensor frame:
 * x forward, y left, z up): a ground plane plus box-shaped objects to label —
 * a car and a pedestrian, placed differently per variant.
 */
export function samplePointCloudPcd(variant: number): string {
  const random = seeded(variant + 7)
  const points: number[][] = []
  for (let x = -20; x <= 20; x += 0.5) {
    for (let y = -15; y <= 15; y += 0.5) {
      points.push([x + random() * 0.2, y + random() * 0.2, random() * 0.05, 0.2])
    }
  }
  const objects = [
    // center x, y; length, width, height; intensity
    [6 + variant * 4, -3, 4.2, 1.8, 1.5, 0.8],
    [-5, 4 - variant * 3, 0.6, 0.6, 1.8, 0.6],
    [12, 6 + variant, 1.8, 0.6, 1.6, 0.7],
  ]
  for (const [cx, cy, length, width, height, intensity] of objects) {
    const count = Math.round(length * width * height * 120)
    for (let i = 0; i < count; i++) {
      // Points on the object's surface, as a scanner would see them.
      const face = Math.floor(random() * 3)
      const u = random() - 0.5
      const v = random() - 0.5
      const side = random() < 0.5 ? -0.5 : 0.5
      const local =
        face === 0 ? [side, u, v + 0.5] : face === 1 ? [u, side, v + 0.5] : [u, v, 1]
      points.push([
        cx + local[0] * length,
        cy + local[1] * width,
        local[2] * height,
        intensity,
      ])
    }
  }
  const header = [
    "# .PCD v0.7 - VaiLabel sample scan",
    "VERSION 0.7",
    "FIELDS x y z intensity",
    "SIZE 4 4 4 4",
    "TYPE F F F F",
    "COUNT 1 1 1 1",
    `WIDTH ${points.length}`,
    "HEIGHT 1",
    "VIEWPOINT 0 0 0 1 0 0 0",
    `POINTS ${points.length}`,
    "DATA ascii",
  ]
  return [...header, ...points.map((p) => p.map((n) => n.toFixed(3)).join(" "))].join("\n") + "\n"
}

// ── DICOM ────────────────────────────────────────────────────────────────────
const CT_IMAGE_STORAGE = "1.2.840.10008.5.1.4.1.1.2"
const SAMPLE_UID_ROOT = "1.2.826.0.1.3680043.10.2"
const CT_SIZE = 128
const CT_SLICES = 16

/** A generated CT series: slice files (relative paths) + the series record. */
export interface SampleDicomSeries {
  files: Array<{ path: string; dataUrl: string }>
  series: DicomSeries
}

/**
 * A small synthetic chest-CT-like series (int16, Hounsfield units via a -1024
 * rescale): an elliptical body, two lungs and a spherical "lesion" whose
 * position differs per variant — something to segment or box.
 */
export function sampleDicomSeries(variant: number, folder: string): SampleDicomSeries {
  const seriesUid = `${SAMPLE_UID_ROOT}.${variant + 1}`
  const lesion = { x: 40 + variant * 40, y: 58, z: 7.5, r: 9 }
  const files: SampleDicomSeries["files"] = []
  const slices: DicomSeries["slices"] = []
  for (let z = 0; z < CT_SLICES; z++) {
    const values = new Int16Array(CT_SIZE * CT_SIZE)
    for (let y = 0; y < CT_SIZE; y++) {
      for (let x = 0; x < CT_SIZE; x++) {
        const nx = (x - 64) / 56
        const ny = (y - 64) / 44
        let hu = -1000
        if (nx * nx + ny * ny <= 1) hu = 40
        for (const cx of [40, 88]) {
          const lx = (x - cx) / 18
          const ly = (y - 60) / 28
          if (lx * lx + ly * ly <= 1) hu = -820
        }
        const d = Math.hypot(x - lesion.x, y - lesion.y, (z - lesion.z) * 2)
        if (d <= lesion.r) hu = 120
        values[y * CT_SIZE + x] = hu + 1024 + ((x * 31 + y * 17 + z * 7) % 9) - 4
      }
    }
    const sopUid = `${seriesUid}.${z + 1}`
    const bytes = encodeDicom(CT_IMAGE_STORAGE, sopUid, [
      { tag: "0008,0016", vr: "UI", value: CT_IMAGE_STORAGE },
      { tag: "0008,0018", vr: "UI", value: sopUid },
      { tag: "0008,0060", vr: "CS", value: "CT" },
      { tag: "0008,103E", vr: "LO", value: `Sample chest CT ${variant + 1}` },
      { tag: "0010,0010", vr: "PN", value: "SAMPLE^PHANTOM" },
      { tag: "0020,000D", vr: "UI", value: `${SAMPLE_UID_ROOT}.0` },
      { tag: "0020,000E", vr: "UI", value: seriesUid },
      { tag: "0020,0013", vr: "IS", value: String(z + 1) },
      { tag: "0020,0032", vr: "DS", value: `-64\\-64\\${z * 2.5}` },
      { tag: "0020,0037", vr: "DS", value: "1\\0\\0\\0\\1\\0" },
      { tag: "0028,0002", vr: "US", value: 1 },
      { tag: "0028,0004", vr: "CS", value: "MONOCHROME2" },
      { tag: "0028,0010", vr: "US", value: CT_SIZE },
      { tag: "0028,0011", vr: "US", value: CT_SIZE },
      { tag: "0028,0030", vr: "DS", value: "1\\1" },
      { tag: "0028,0100", vr: "US", value: 16 },
      { tag: "0028,0101", vr: "US", value: 16 },
      { tag: "0028,0102", vr: "US", value: 15 },
      { tag: "0028,0103", vr: "US", value: 1 },
      { tag: "0028,1050", vr: "DS", value: "40" },
      { tag: "0028,1051", vr: "DS", value: "400" },
      { tag: "0028,1052", vr: "DS", value: "-1024" },
      { tag: "0028,1053", vr: "DS", value: "1" },
      { tag: "7FE0,0010", vr: "OW", value: new Uint8Array(values.buffer) },
    ])
    const path = `${folder}/IM${String(z + 1).padStart(4, "0")}`
    files.push({ path, dataUrl: `data:application/dicom;base64,${base64(bytes)}` })
    slices.push({ path, frame: 0, sopUid })
  }
  return {
    files,
    series: {
      uid: seriesUid,
      description: `Sample chest CT ${variant + 1}`,
      modality: "CT",
      rows: CT_SIZE,
      columns: CT_SIZE,
      slices,
    },
  }
}
