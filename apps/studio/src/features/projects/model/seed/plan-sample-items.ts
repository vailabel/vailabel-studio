import {
  isMultiFieldJudgement,
  TEXTUAL_OBJECT_TAGS,
} from "@/shared/lib/label-config/infer"
import { VIEWER_OBJECT_TAGS } from "@/shared/lib/label-config/support"
import type { LabelConfig, ObjectTag } from "@/shared/lib/label-config/types"
import {
  SAMPLE_CHATS,
  SAMPLE_DIALOGUES,
  SAMPLE_HTML,
  SAMPLE_LISTS,
  SAMPLE_TABLE_ROWS,
  sampleFieldText,
  sampleTexts,
} from "./sample-content"
import {
  assetName,
  AUDIO_POOLS,
  DICOM_SERIES,
  IMAGE_GALLERY,
  IMAGE_POOLS,
  PDF_POOLS,
  pickPool,
  POINT_CLOUD_POOLS,
  TIMESERIES_POOLS,
  VIDEO_POOLS,
  type SampleAsset,
  type SamplePool,
} from "./sample-library"

// Decide which sample files and items a project needs from its labeling config
// and a few words about the template (`hint`), so every template, present or
// future, gets fitting real data without a per-template table. The seeder
// turns this plan into files on disk + items.

/** A file to write, relative to the project's sample folder: literal text, or
 *  a copy of a bundled file (a path under public/samples). */
export type SampleFile =
  | { path: string; kind: "text"; content: string }
  | { path: string; kind: "asset"; asset: string }

/** A row field: literal text, a reference to one of the plan's files, or a
 *  folder of DICOM slices (relative to the sample folder) to read as a series. */
export type SampleValue = string | { file: string } | { dicomFolder: string }

export interface SampleItem {
  name: string
  /** The item's own file (relative), for file-backed items. */
  file?: string
  /** Pixel size, for image items. */
  width?: number
  height?: number
  /** Clip metadata, for video items. */
  video?: SampleAsset["video"]
  /** Inline row data, keyed by the config's field names. */
  data?: Record<string, SampleValue>
}

export interface SamplePlan {
  files: SampleFile[]
  items: SampleItem[]
  /** Why there are no items, when that is expected. */
  note?: string
}

const VIEWER_TAGS = new Set<string>(VIEWER_OBJECT_TAGS)
const ROWS = 3

const assetFile = (asset: SampleAsset): SampleFile => ({
  path: assetName(asset),
  kind: "asset",
  asset: asset.path,
})

/** The files an object tag reads: text documents, or a pool of bundled media. */
type FileKind =
  | { pools: SamplePool[] }
  | { texts: (hint: string) => string[]; name: string; ext: string }

const FILE_KINDS: Record<string, FileKind> = {
  image: { pools: IMAGE_POOLS },
  audio: { pools: AUDIO_POOLS },
  video: { pools: VIDEO_POOLS },
  timeseries: { pools: TIMESERIES_POOLS },
  pdf: { pools: PDF_POOLS },
  pointcloud: { pools: POINT_CLOUD_POOLS },
  text: { texts: sampleTexts, name: "document", ext: "txt" },
  hypertext: { texts: () => SAMPLE_HTML, name: "page", ext: "html" },
  paragraphs: { texts: () => SAMPLE_DIALOGUES, name: "dialogue", ext: "json" },
  chat: { texts: () => SAMPLE_CHATS, name: "chat", ext: "json" },
  list: { texts: () => SAMPLE_LISTS, name: "results", ext: "json" },
}

const STRUCTURED_TAGS = new Set(["paragraphs", "chat", "list"])

/** Text for a row field: structured objects get their own sample shape. */
function fieldText(field: ObjectTag, row: number, hint: string): string {
  const kind = STRUCTURED_TAGS.has(field.tag)
    ? FILE_KINDS[field.tag]
    : undefined
  if (kind && "texts" in kind) {
    const texts = kind.texts(hint)
    return texts[row % texts.length]
  }
  return sampleFieldText(field.name, row, hint)
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

/** The template words that pick sample data: the caller's hint (template id,
 *  label, description) plus the config's control and label names. */
function hintOf(config: LabelConfig, context: string): string {
  return [
    context,
    ...config.controls.flatMap((control) => [
      control.name,
      ...control.choices.map((choice) => choice.value),
    ]),
  ]
    .join(" ")
    .toLowerCase()
}

/** The image for one cell of a row: medical rows cycle through their pool;
 *  other rows show a pair of one subject first, then other subjects. */
function rowImage(hint: string, row: number, column: number): SampleAsset {
  const pool = pickPool(IMAGE_POOLS, hint)
  if (pool !== pickPool(IMAGE_POOLS, ""))
    return pool[(row + column) % pool.length]
  const subject =
    IMAGE_GALLERY[(row + Math.max(0, column - 1)) % IMAGE_GALLERY.length]
  return subject[column === 1 ? 1 : 0]
}

/** One row per task; each field is text or (for image fields) a photo. */
function planRows(fields: ObjectTag[], hint: string): SamplePlan {
  const files = new Map<string, SampleFile>()
  const items: SampleItem[] = []
  for (let row = 0; row < ROWS; row++) {
    const data: Record<string, SampleValue> = {}
    fields.forEach((field, column) => {
      if (field.tag !== "image") {
        data[field.valueKey] = fieldText(field, row, hint)
        return
      }
      const file = assetFile(rowImage(hint, row, column))
      files.set(file.path, file)
      data[field.valueKey] = { file: file.path }
    })
    items.push({ name: `Task ${row + 1}`, data })
  }
  return { files: [...files.values()], items }
}

function planDicom(): SamplePlan {
  const files: SampleFile[] = []
  const items: SampleItem[] = []
  for (const series of DICOM_SERIES) {
    const folder = assetName({ path: series.folder })
    for (let slice = 1; slice <= series.slices; slice++) {
      const name = `IM${String(slice).padStart(4, "0")}`
      files.push({
        path: `${folder}/${name}`,
        kind: "asset",
        asset: `${series.folder}/${name}`,
      })
    }
    items.push({
      name: `${series.name} (${series.slices} slices)`,
      file: folder,
      data: { series: { dicomFolder: folder } },
    })
  }
  return { files, items }
}

/**
 * Plan the sample files and items for a config. `context` is free text about
 * the template (its id, label and description) that steers which real data
 * fits — receipts for OCR, X-rays for medical images, and so on.
 */
export function planSampleItems(config: LabelConfig, context = ""): SamplePlan {
  const fields = dataFields(config)
  const hint = hintOf(config, context)

  if (isMultiFieldJudgement(config)) return planRows(fields, hint)

  if (fields.some((field) => field.tag === "table")) {
    return {
      files: [],
      items: SAMPLE_TABLE_ROWS.map((row, index) => ({
        name: `Row ${index + 1}`,
        data: row,
      })),
    }
  }

  // A config-editor viewer, or an object with its own editor (point clouds,
  // DICOM, video tracking).
  const primary = fields.find(
    (field) =>
      VIEWER_TAGS.has(field.tag) ||
      FILE_KINDS[field.tag] ||
      field.tag === "dicom"
  )
  if (!primary) {
    return {
      files: [],
      items: [],
      note: "This config has no data object to fill.",
    }
  }
  if (primary.tag === "dicom") return planDicom()

  const kind = FILE_KINDS[primary.tag]
  if (!kind) {
    return { files: [], items: [], note: `No sample data for ${primary.tag}.` }
  }
  // Extra text fields shown beside the main object (a question about a text).
  const extras = fields.filter(
    (field) => field !== primary && TEXTUAL_OBJECT_TAGS.has(field.tag)
  )
  const files: SampleFile[] = []
  const items: SampleItem[] = []

  if ("pools" in kind) {
    for (const asset of pickPool(kind.pools, hint)) {
      const file = assetFile(asset)
      files.push(file)
      items.push({
        name: file.path,
        file: file.path,
        width: asset.width,
        height: asset.height,
        video: asset.video,
      })
    }
    return { files, items }
  }

  kind.texts(hint).forEach((content, index) => {
    const path = `${kind.name}-${index + 1}.${kind.ext}`
    files.push({ path, kind: "text", content })
    const item: SampleItem = { name: path, file: path }
    if (extras.length > 0) {
      item.data = Object.fromEntries(
        extras.map((field) => [field.valueKey, fieldText(field, index, hint)])
      )
      // An item with row data reads every text field from the row, so the main
      // document has to ride along inline too.
      item.data[primary.valueKey] = content
    }
    items.push(item)
  })
  return { files, items }
}
