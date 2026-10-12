import {
  isMultiFieldJudgement,
  TEXTUAL_OBJECT_TAGS,
} from "@/shared/lib/label-config/infer"
import { VIEWER_OBJECT_TAGS } from "@/shared/lib/label-config/support"
import type { LabelConfig, ObjectTag } from "@/shared/lib/label-config/types"
import {
  SAMPLE_HTML,
  SAMPLE_PDFS,
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

/** A row field: literal text, or a reference to one of the plan's files. */
export type SampleValue = string | { file: string }

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
        data[field.valueKey] = sampleFieldText(field.name, row)
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

  const primary = fields.find((field) => VIEWER_TAGS.has(field.tag))
  if (!primary) {
    return {
      files: [],
      items: [],
      note: "This config has no data object to fill.",
    }
  }
  if (primary.tag === "video") {
    return {
      files: [],
      items: [],
      note: "Video clips are imported inside the editor.",
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
        extras.map((field) => [
          field.valueKey,
          sampleFieldText(field.name, index),
        ])
      )
      // An item with row data reads every text field from the row, so the main
      // document has to ride along inline too.
      if (kind.inline) item.data[primary.valueKey] = kind.inline(index)
    }
    items.push(item)
  }
  return { files, items }
}
