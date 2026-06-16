import type { Annotation, ImageData, Label } from "@/types/core"
import type { Modality } from "@/types/modality"
import { ensureDirectory, readTextFile, writeTextFile } from "@/lib/desktop"
import { toLabelMe } from "@/lib/labelme-adapter"
import { toCoco } from "./coco-exporter"
import { toYolo } from "./yolo-exporter"
import { toVocXml, vocFileName } from "./voc-exporter"
import { baseName } from "./geometry"
import { toTextJsonl, type TextExportDoc } from "@/lib/text-spans"

export type ExportFormat =
  | "labelme"
  | "coco"
  | "yolo"
  | "yolo-seg"
  | "voc"
  | "jsonl"

export interface ExportDataset {
  images: ImageData[]
  annotationsByImage: Map<string, Annotation[]>
  labels: Label[]
}

export interface ExportFormatMeta {
  id: ExportFormat
  label: string
  description: string
  /** Which project modality this format applies to. */
  modality: Modality
}

export const EXPORT_FORMATS: ExportFormatMeta[] = [
  {
    id: "labelme",
    label: "LabelMe JSON",
    description: "One <image>.json per image (imageData: null).",
    modality: "image",
  },
  {
    id: "coco",
    label: "COCO",
    description: "Single annotations.json with bbox + segmentation.",
    modality: "image",
  },
  {
    id: "yolo",
    label: "YOLO Detection",
    description: "Per-image .txt boxes + classes.txt.",
    modality: "image",
  },
  {
    id: "yolo-seg",
    label: "YOLO Segmentation",
    description: "Per-image .txt polygons + classes.txt.",
    modality: "image",
  },
  {
    id: "voc",
    label: "Pascal VOC",
    description: "One <image>.xml per image.",
    modality: "image",
  },
  {
    id: "jsonl",
    label: "JSONL (doccano)",
    description: "One documents.jsonl with text + spans + classes.",
    modality: "text",
  },
]

/** Export formats applicable to a project's modality (defaults to image). */
export function exportFormatsFor(modality?: Modality): ExportFormatMeta[] {
  const match = EXPORT_FORMATS.filter((format) => format.modality === modality)
  return match.length > 0 ? match : EXPORT_FORMATS.filter((f) => f.modality === "image")
}

const join = (dir: string, file: string) =>
  `${dir.replace(/[\\/]+$/, "")}/${file}`

/**
 * Write a project's images + annotations to `outputDir` in the chosen format.
 * Returns the number of files written. Uses the Tauri text-file command, so no
 * base64 and no image copying — only annotation files are produced.
 */
export async function exportDataset(
  format: ExportFormat,
  data: ExportDataset,
  outputDir: string
): Promise<number> {
  await ensureDirectory(outputDir)
  const { images, annotationsByImage, labels } = data

  if (format === "jsonl") {
    const docs: TextExportDoc[] = await Promise.all(
      images.map(async (image) => {
        const annotations = annotationsByImage.get(image.id) || []
        const text = (await readTextFile(image.path).catch(() => null)) ?? ""
        const label: Array<[number, number, string]> = []
        const cats: string[] = []
        for (const annotation of annotations) {
          if (annotation.meta?.kind === "text") {
            label.push([
              annotation.meta.charStart,
              annotation.meta.charEnd,
              annotation.name,
            ])
          } else if (annotation.type === "classification") {
            cats.push(annotation.name)
          }
        }
        label.sort((a, b) => a[0] - b[0])
        return { text, label, cats }
      })
    )
    await writeTextFile(join(outputDir, "documents.jsonl"), toTextJsonl(docs))
    return 1
  }

  if (format === "coco") {
    const coco = toCoco(images, annotationsByImage, labels)
    await writeTextFile(
      join(outputDir, "annotations.json"),
      JSON.stringify(coco, null, 2)
    )
    return 1
  }

  if (format === "yolo" || format === "yolo-seg") {
    const yolo = toYolo(images, annotationsByImage, labels, {
      segmentation: format === "yolo-seg",
    })
    await writeTextFile(join(outputDir, "classes.txt"), yolo.classesTxt)
    await Promise.all(
      yolo.files.map((file) =>
        writeTextFile(join(outputDir, file.name), file.content)
      )
    )
    return yolo.files.length + 1
  }

  if (format === "voc") {
    await Promise.all(
      images.map((image) =>
        writeTextFile(
          join(outputDir, vocFileName(image)),
          toVocXml(image, annotationsByImage.get(image.id) || [])
        )
      )
    )
    return images.length
  }

  // labelme
  await Promise.all(
    images.map((image) =>
      writeTextFile(
        join(outputDir, `${baseName(image.name)}.json`),
        JSON.stringify(
          toLabelMe(image, annotationsByImage.get(image.id) || []),
          null,
          2
        )
      )
    )
  )
  return images.length
}
