import {
  inferModalityTask,
  isMultiFieldJudgement,
  TEXTUAL_OBJECT_TAGS,
} from "@/shared/lib/label-config/infer"
import { VIEWER_OBJECT_TAGS } from "@/shared/lib/label-config/support"
import type { LabelConfig, ObjectTag } from "@/shared/lib/label-config/types"
import type { DicomSeries } from "@/shared/lib/dicom/dicom"
import {
  SAMPLE_CHATS,
  SAMPLE_DIALOGUES,
  SAMPLE_HTML,
  SAMPLE_LISTS,
  SAMPLE_PDFS,
  sampleDicomSeries,
  samplePointCloudPcd,
  SAMPLE_TABLE_ROWS,
  SAMPLE_TEXTS,
  sampleFieldText,
  sampleTimeSeriesCsv,
} from "./sample-content"

// Decide which sample files and items a project needs, purely from its labeling
// config — so every template, present or future, gets fitting data without a
// per-template table. The seeder turns this plan into files on disk + items.

/** A file to write, relative to the project's sample folder. */
export type SampleFile =
  | { path: string; kind: "text"; content: string }
  | { path: string; kind: "image"; variant: number; caption?: string }
  | { path: string; kind: "audio"; variant: number }
  /** Arbitrary bytes, as a data URL (DICOM slices). */
  | { path: string; kind: "binary"; dataUrl: string }

/** A row field: literal text, a reference to one of the plan's files, or a
 *  DICOM series whose slice paths are relative to the sample folder. */
export type SampleValue = string | { file: string } | { series: DicomSeries }

export interface SampleItem {
  name: string
  /** The item's own file (relative), for file-backed items. */
  file?: string
  isImage?: boolean
  /** Inline row data, keyed by the config's field names. */
  data?: Record<string, SampleValue>
}

export interface SamplePlan {
  files: SampleFile[]
  items: SampleItem[]
  /** Why there are no items, when that is expected (e.g. video). */
  note?: string
}

const VIEWER_TAGS = new Set<string>(VIEWER_OBJECT_TAGS)
const ROWS = 3

interface FileKind {
  count: number
  file: (index: number) => SampleFile
  /** Content to inline when the item also carries other row fields. */
  inline?: (index: number) => string
}

const FILE_KINDS: Record<string, FileKind> = {
  image: {
    count: 3,
    file: (index) => ({
      path: `image-${index + 1}.png`,
      kind: "image",
      variant: index,
    }),
  },
  text: {
    count: SAMPLE_TEXTS.length,
    file: (index) => ({
      path: `document-${index + 1}.txt`,
      kind: "text",
      content: SAMPLE_TEXTS[index],
    }),
    inline: (index) => SAMPLE_TEXTS[index],
  },
  hypertext: {
    count: SAMPLE_HTML.length,
    file: (index) => ({
      path: `page-${index + 1}.html`,
      kind: "text",
      content: SAMPLE_HTML[index],
    }),
    inline: (index) => SAMPLE_HTML[index],
  },
  timeseries: {
    count: 2,
    // The second series uses ISO timestamps so both axis types are exercised.
    file: (index) => ({
      path: `series-${index + 1}.csv`,
      kind: "text",
      content: sampleTimeSeriesCsv(index, index === 1),
    }),
    inline: (index) => sampleTimeSeriesCsv(index, index === 1),
  },
  audio: {
    count: 2,
    file: (index) => ({
      path: `clip-${index + 1}.wav`,
      kind: "audio",
      variant: index,
    }),
  },
  pdf: {
    count: SAMPLE_PDFS.length,
    file: (index) => ({
      path: `document-${index + 1}.pdf`,
      kind: "text",
      content: SAMPLE_PDFS[index],
    }),
  },
}

/** A structured text kind: one JSON document per item. */
function jsonKind(name: string, samples: string[]): FileKind {
  return {
    count: samples.length,
    file: (index) => ({
      path: `${name}-${index + 1}.json`,
      kind: "text",
      content: samples[index],
    }),
    inline: (index) => samples[index],
  }
}

FILE_KINDS.pointcloud = {
  count: 2,
  file: (index) => ({
    path: `scan-${index + 1}.pcd`,
    kind: "text",
    content: samplePointCloudPcd(index),
  }),
}
FILE_KINDS.paragraphs = jsonKind("dialogue", SAMPLE_DIALOGUES)
FILE_KINDS.chat = jsonKind("chat", SAMPLE_CHATS)
FILE_KINDS.list = jsonKind("results", SAMPLE_LISTS)

const STRUCTURED_TAGS = new Set(["paragraphs", "chat", "list"])

/** Text for a row field: structured objects get their own sample shape. */
function fieldText(field: ObjectTag, row: number): string {
  const kind = STRUCTURED_TAGS.has(field.tag) ? FILE_KINDS[field.tag] : undefined
  return kind?.inline ? kind.inline(row % kind.count) : sampleFieldText(field.name, row)
}

/** The objects that need data. Normally those bound to a `$field`; a config
 *  whose only object binds another way (e.g. a page list) still needs a file. */
function dataFields(config: LabelConfig): ObjectTag[] {
  const bound = config.objects.filter((object) => object.value.startsWith("$"))
  if (bound.length > 0) return bound
  return config.objects
    .filter((object) => VIEWER_TAGS.has(object.tag))
    .slice(0, 1)
}

/** One row per task; each field is text or (for image fields) a drawn image. */
function planRows(fields: ObjectTag[]): SamplePlan {
  const files: SampleFile[] = []
  const items: SampleItem[] = []
  for (let row = 0; row < ROWS; row++) {
    const data: Record<string, SampleValue> = {}
    fields.forEach((field, column) => {
      if (field.tag !== "image") {
        data[field.valueKey] = fieldText(field, row)
        return
      }
      const path = `task-${row + 1}-${field.name}.png`
      files.push({
        path,
        kind: "image",
        // Related images within a row, different scenes across rows.
        variant: row * 2 + (column % 2),
        caption: field.attrs.title || field.name,
      })
      data[field.valueKey] = { file: path }
    })
    items.push({ name: `Task ${row + 1}`, data })
  }
  return { files, items }
}

export function planSampleItems(config: LabelConfig): SamplePlan {
  const fields = dataFields(config)

  if (isMultiFieldJudgement(config)) return planRows(fields)

  if (fields.some((field) => field.tag === "table")) {
    return {
      files: [],
      items: SAMPLE_TABLE_ROWS.map((row, index) => ({
        name: `Row ${index + 1}`,
        data: row,
      })),
    }
  }

  // A config-editor viewer, or an object with its own editor and sample files
  // (point clouds).
  const primary = fields.find(
    (field) => VIEWER_TAGS.has(field.tag) || FILE_KINDS[field.tag] || field.tag === "dicom"
  )
  if (!primary) {
    return {
      files: [],
      items: [],
      note: "This config has no data object to fill.",
    }
  }
  if (primary.tag === "dicom") {
    // One task per series; each series is a folder of slice files.
    const files: SampleFile[] = []
    const items: SampleItem[] = []
    for (let variant = 0; variant < 2; variant++) {
      const folder = `ct-${variant + 1}`
      const sample = sampleDicomSeries(variant, folder)
      for (const file of sample.files) files.push({ kind: "binary", ...file })
      items.push({
        name: `${sample.series.description} (${sample.series.slices.length} slices)`,
        file: folder,
        data: { series: { series: sample.series } },
      })
    }
    return { files, items }
  }
  if (primary.tag === "video") {
    return {
      files: [],
      items: [],
      // Tracking projects import clips in the video editor (FFmpeg pipeline);
      // config-driven video projects take files from the Data tab.
      note:
        inferModalityTask(config).modality === "video"
          ? "Video clips are imported inside the editor."
          : "Add video files from the project's Data tab.",
    }
  }

  const kind = FILE_KINDS[primary.tag]
  // Extra text fields shown beside the main object (a question about an image).
  const extras = fields.filter(
    (field) => field !== primary && TEXTUAL_OBJECT_TAGS.has(field.tag)
  )
  const files: SampleFile[] = []
  const items: SampleItem[] = []
  for (let index = 0; index < kind.count; index++) {
    const file = kind.file(index)
    files.push(file)
    const item: SampleItem = {
      name: file.path,
      file: file.path,
      isImage: file.kind === "image",
    }
    if (extras.length > 0) {
      item.data = Object.fromEntries(
        extras.map((field) => [field.valueKey, fieldText(field, index)])
      )
      // An item with row data reads every text field from the row, so the main
      // document has to ride along inline too.
      if (kind.inline) item.data[primary.valueKey] = kind.inline(index)
    }
    items.push(item)
  }
  return { files, items }
}
