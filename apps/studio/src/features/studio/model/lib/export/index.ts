import type { Annotation, Item, Label } from "@/shared/types/core"
import type { Modality, Task } from "@/shared/types/modality"
import type { Track, VideoMeta } from "@/shared/types/video"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import { ensureDirectory, readTextFile, writeTextFile } from "@/shared/lib/desktop"
import { toLabelMe } from "@/shared/lib/labelme-adapter"
import { toCoco } from "./coco-exporter"
import { toYolo } from "./yolo-exporter"
import { toVocXml, vocFileName } from "./voc-exporter"
import { toConll, type NerDoc } from "./conll-exporter"
import { toSpacy } from "./spacy-exporter"
import { toSrt } from "./srt-exporter"
import { toVtt } from "./vtt-exporter"
import { toMot } from "./mot-exporter"
import { toResultsJsonl } from "./results-jsonl-exporter"
import { toCsv } from "./csv-exporter"
import { toKitti } from "./kitti-exporter"
import { toMedicalJson } from "./medical-exporter"
import { toLabelStudioTasks, toLabelStudioVideoTasks } from "./label-studio-exporter"
import { baseName } from "./geometry"
import {
  annotationsToSpans,
  toTextJsonl,
  type TextExportDoc,
} from "@/features/studio/model/lib/text-spans"
import {
  annotationsToSegments,
  toAudioJsonl,
  type AudioExportClip,
} from "@/features/studio/model/lib/audio-segments"

export type ExportFormat =
  | "labelme"
  | "coco"
  | "yolo"
  | "yolo-seg"
  | "voc"
  | "jsonl"
  | "conll"
  | "spacy"
  | "audio-jsonl"
  | "srt"
  | "vtt"
  | "mot"
  | "results-jsonl"
  | "csv"
  | "kitti"
  | "medical-json"
  | "label-studio"

/** A video clip with its keyframe tracks (video projects have no items). */
export interface ExportVideo {
  meta: VideoMeta
  tracks: Track[]
}

export interface ExportDataset {
  images: Item[]
  annotationsByImage: Map<string, Annotation[]>
  labels: Label[]
  /** The project's task and parsed labeling config (`settings.labelConfig`). */
  project: {
    task?: Task
    labelConfig?: LabelConfig
  }
  /** Video projects only: every clip's meta + tracks. */
  videos?: ExportVideo[]
}

export interface ExportFormatMeta {
  id: ExportFormat
  label: string
  description: string
  /** Project modalities this format applies to. */
  modalities: Modality[]
  /** Restricts the format to these tasks; omitted = every task of the modality. */
  tasks?: Task[]
}

const SPAN_TASKS: Task[] = ["ner", "relation_extraction"]

export const EXPORT_FORMATS: ExportFormatMeta[] = [
  {
    id: "labelme",
    label: "LabelMe JSON",
    description: "One <image>.json per image (imageData: null).",
    modalities: ["image"],
  },
  {
    id: "coco",
    label: "COCO",
    description: "Single annotations.json with bbox + segmentation.",
    modalities: ["image"],
  },
  {
    id: "yolo",
    label: "YOLO Detection",
    description: "Per-image .txt boxes + classes.txt.",
    modalities: ["image"],
  },
  {
    id: "yolo-seg",
    label: "YOLO Segmentation",
    description: "Per-image .txt polygons + classes.txt.",
    modalities: ["image"],
  },
  {
    id: "voc",
    label: "Pascal VOC",
    description: "One <image>.xml per image.",
    modalities: ["image"],
  },
  {
    id: "jsonl",
    label: "JSONL (doccano)",
    description: "One documents.jsonl with text + spans + classes.",
    modalities: ["text"],
  },
  {
    id: "conll",
    label: "CoNLL (BIO)",
    description: "One ner.conll of tokens with BIO entity tags.",
    modalities: ["text"],
    tasks: SPAN_TASKS,
  },
  {
    id: "spacy",
    label: "spaCy JSON",
    description: "One spacy.json of {text, entities: [[start, end, label]]}.",
    modalities: ["text"],
    tasks: SPAN_TASKS,
  },
  {
    id: "audio-jsonl",
    label: "JSONL (segments)",
    description: "One audio.jsonl with time-range segments + transcripts.",
    modalities: ["audio"],
  },
  {
    id: "srt",
    label: "SubRip (SRT)",
    description: "One <clip>.srt of timed transcript cues per clip.",
    modalities: ["audio"],
    tasks: ["transcription"],
  },
  {
    id: "vtt",
    label: "WebVTT",
    description: "One <clip>.vtt of timed transcript cues per clip.",
    modalities: ["audio"],
    tasks: ["transcription"],
  },
  {
    id: "mot",
    label: "MOTChallenge",
    description: "Per video: gt/gt.txt (1-based frames, track ids) + seqinfo.ini.",
    modalities: ["video"],
  },
  {
    id: "results-jsonl",
    label: "Results JSONL",
    description: "One results.jsonl of {id, data, results} per item.",
    modalities: ["custom", "tabular"],
  },
  {
    id: "csv",
    label: "CSV",
    description: "One labels.csv of the row's columns plus label columns.",
    modalities: ["tabular"],
  },
  {
    id: "kitti",
    label: "KITTI",
    description:
      "label_2/<scan>.txt per scan, one line per cuboid (LiDAR frame: bottom-center + yaw).",
    modalities: ["pointcloud"],
  },
  {
    id: "medical-json",
    label: "Medical JSON",
    description:
      "One medical.json: per series its UIDs, regions per slice (SOP Instance UID) and answers. No DICOM-SEG / NIfTI.",
    modalities: ["medical"],
  },
  {
    id: "label-studio",
    label: "Label Studio JSON",
    description: "One annotations.json of tasks with a generic result array.",
    modalities: ["custom", "video", "pointcloud", "medical"],
  },
]

/** Export formats for a project's modality, narrowed by task when known. An
 *  unknown modality has no formats. */
export function exportFormatsFor(
  modality?: Modality,
  task?: Task
): ExportFormatMeta[] {
  if (!modality) return []
  return EXPORT_FORMATS.filter(
    (format) =>
      format.modalities.includes(modality) &&
      (!task || !format.tasks || format.tasks.includes(task))
  )
}

const join = (dir: string, file: string) =>
  `${dir.replace(/[\\/]+$/, "")}/${file}`

const annotationsOf = (data: ExportDataset, item: Item) =>
  data.annotationsByImage.get(item.id) || []

const writeJson = (outputDir: string, file: string, value: unknown) =>
  writeTextFile(join(outputDir, file), JSON.stringify(value, null, 2))

/** Each document's text (read from disk) with its labeled spans. */
const nerDocs = (data: ExportDataset): Promise<NerDoc[]> =>
  Promise.all(
    data.images.map(async (item) => ({
      text: (await readTextFile(item.path).catch(() => null)) ?? "",
      spans: annotationsToSpans(annotationsOf(data, item)),
    }))
  )

/** One file per clip, named after the clip. */
async function writePerClip(
  data: ExportDataset,
  outputDir: string,
  extension: string,
  render: (cues: ReturnType<typeof annotationsToSegments>) => string
): Promise<number> {
  await Promise.all(
    data.images.map((item) =>
      writeTextFile(
        join(outputDir, `${baseName(item.name)}.${extension}`),
        render(annotationsToSegments(annotationsOf(data, item)))
      )
    )
  )
  return data.images.length
}

type Writer = (data: ExportDataset, outputDir: string) => Promise<number>

// One writer per format; each returns the number of files written.
const WRITERS: Record<ExportFormat, Writer> = {
  async labelme(data, outputDir) {
    await Promise.all(
      data.images.map((item) =>
        writeJson(
          outputDir,
          `${baseName(item.name)}.json`,
          toLabelMe(item, annotationsOf(data, item))
        )
      )
    )
    return data.images.length
  },

  async coco(data, outputDir) {
    const { images, annotationsByImage, labels } = data
    await writeJson(outputDir, "annotations.json", toCoco(images, annotationsByImage, labels))
    return 1
  },

  yolo: (data, outputDir) => writeYolo(data, outputDir, false),
  "yolo-seg": (data, outputDir) => writeYolo(data, outputDir, true),

  async voc(data, outputDir) {
    await Promise.all(
      data.images.map((item) =>
        writeTextFile(
          join(outputDir, vocFileName(item)),
          toVocXml(item, annotationsOf(data, item))
        )
      )
    )
    return data.images.length
  },

  async jsonl(data, outputDir) {
    const docs: TextExportDoc[] = await Promise.all(
      data.images.map(async (image) => {
        const annotations = annotationsOf(data, image)
        const text = (await readTextFile(image.path).catch(() => null)) ?? ""
        const label: Array<[number, number, string]> = []
        const cats: string[] = []
        const spanById = new Map<string, [number, number]>()
        let translation: string | undefined

        for (const annotation of annotations) {
          const meta = annotation.meta
          if (meta?.kind === "text") {
            label.push([meta.charStart, meta.charEnd, annotation.name])
            spanById.set(annotation.id, [meta.charStart, meta.charEnd])
          } else if (meta?.kind === "value") {
            translation = meta.text
          } else if (annotation.type === "classification") {
            cats.push(annotation.name)
          }
        }

        // Relations reference entities by offset so the export is self-contained.
        const relations: TextExportDoc["relations"] = []
        for (const annotation of annotations) {
          if (annotation.meta?.kind !== "relation") continue
          const from = spanById.get(annotation.meta.fromId)
          const to = spanById.get(annotation.meta.toId)
          if (from && to) relations.push({ from, to, type: annotation.name })
        }

        label.sort((a, b) => a[0] - b[0])
        return { text, label, cats, relations, translation }
      })
    )
    await writeTextFile(join(outputDir, "documents.jsonl"), toTextJsonl(docs))
    return 1
  },

  async conll(data, outputDir) {
    await writeTextFile(join(outputDir, "ner.conll"), toConll(await nerDocs(data)))
    return 1
  },

  async spacy(data, outputDir) {
    await writeJson(outputDir, "spacy.json", toSpacy(await nerDocs(data)))
    return 1
  },

  async "audio-jsonl"(data, outputDir) {
    const clips: AudioExportClip[] = data.images.map((image) => {
      const segments = annotationsOf(data, image)
        .filter((annotation) => annotation.meta?.kind === "audio")
        .map((annotation) => {
          const meta = annotation.meta as Extract<
            NonNullable<typeof annotation.meta>,
            { kind: "audio" }
          >
          return {
            start: meta.tStart,
            end: meta.tEnd,
            label: annotation.name,
            text: meta.text,
          }
        })
        .sort((a, b) => a.start - b.start)
      return { audio: image.name, segments }
    })
    await writeTextFile(join(outputDir, "audio.jsonl"), toAudioJsonl(clips))
    return 1
  },

  srt: (data, outputDir) => writePerClip(data, outputDir, "srt", toSrt),
  vtt: (data, outputDir) => writePerClip(data, outputDir, "vtt", toVtt),

  async mot(data, outputDir) {
    const files = toMot(data.videos ?? [], data.labels)
    await Promise.all(
      files.map((file) => writeTextFile(join(outputDir, file.name), file.content))
    )
    return files.length
  },

  async "results-jsonl"(data, outputDir) {
    await writeTextFile(
      join(outputDir, "results.jsonl"),
      toResultsJsonl(data.images, data.annotationsByImage, data.project.labelConfig)
    )
    return 1
  },

  async csv(data, outputDir) {
    await writeTextFile(
      join(outputDir, "labels.csv"),
      toCsv(data.images, data.annotationsByImage, data.project.labelConfig)
    )
    return 1
  },

  async kitti(data, outputDir) {
    const files = toKitti(data.images, data.annotationsByImage)
    await Promise.all(
      files.map((file) => writeTextFile(join(outputDir, file.name), file.content))
    )
    return files.length
  },

  async "medical-json"(data, outputDir) {
    await writeJson(outputDir, "medical.json", toMedicalJson(data.images, data.annotationsByImage))
    return 1
  },

  async "label-studio"(data, outputDir) {
    const config = data.project.labelConfig
    const tasks = data.videos
      ? toLabelStudioVideoTasks(data.videos, config)
      : toLabelStudioTasks(data.images, data.annotationsByImage, config)
    await writeJson(outputDir, "annotations.json", tasks)
    return 1
  },
}

async function writeYolo(
  data: ExportDataset,
  outputDir: string,
  segmentation: boolean
): Promise<number> {
  const yolo = toYolo(data.images, data.annotationsByImage, data.labels, {
    segmentation,
  })
  await writeTextFile(join(outputDir, "classes.txt"), yolo.classesTxt)
  await Promise.all(
    yolo.files.map((file) => writeTextFile(join(outputDir, file.name), file.content))
  )
  return yolo.files.length + 1
}

/**
 * Write a project's items + annotations to `outputDir` in the chosen format.
 * Returns the number of files written. Uses the Tauri text-file command, so no
 * base64 and no media copying — only annotation files are produced.
 */
export async function exportDataset(
  format: ExportFormat,
  data: ExportDataset,
  outputDir: string
): Promise<number> {
  await ensureDirectory(outputDir)
  return WRITERS[format](data, outputDir)
}
