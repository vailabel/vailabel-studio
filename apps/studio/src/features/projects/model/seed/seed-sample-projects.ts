import {
  allowImageDirectory,
  getAppDataDir,
  saveImageFile,
  writeTextFile,
} from "@/shared/lib/desktop"
import { toErrorMessage } from "@/shared/lib/errors"
import {
  configStringForTemplate,
  extractClasses,
} from "@/shared/lib/label-config/generate"
import { inferModalityTask } from "@/shared/lib/label-config/infer"
import {
  LABELING_TEMPLATES,
  type LabelingTemplate,
} from "@/shared/lib/label-config/labeling-templates"
import { parseLabelConfig } from "@/shared/lib/label-config/parse"
import { services } from "@/shared/services"
import type { Project } from "@/shared/types/core"
import { deriveConfigInfo } from "@/features/projects/model/config-info"
import {
  annotationTypesForTask,
  descriptorForKind,
} from "@/features/projects/model/modality-registry"
import {
  planSampleItems,
  type SampleFile,
  type SampleValue,
} from "./plan-sample-items"
import { sampleWavDataUrl } from "./sample-content"
import { SAMPLE_IMAGE_SIZE, sampleImageDataUrl } from "./sample-images"

// Creates one ready-to-label project per template in the catalog, each with a
// few generated items, so every labeling type can be tried without hunting for
// data. Safe to run again: templates that already have a sample are skipped.

export const SAMPLE_NAME_PREFIX = "Sample · "
/** Project legacy type for templates that don't name one (the create-flow default). */
const DEFAULT_PROJECT_TYPE = "image_annotation"

export interface SeedProgress {
  done: number
  total: number
  /** Label of the template being created. */
  current: string
}

export interface SeedSummary {
  created: number
  skipped: number
  failed: Array<{ template: string; message: string }>
}

/** The template a sample project was seeded from, or undefined for a real one. */
export const sampleTemplateId = (project: Project): string | undefined => {
  const id = project.metadata?.sampleTemplateId
  return typeof id === "string" ? id : undefined
}

/** Every template the seeder covers: all of the catalog that can be labeled. */
export const sampleTemplates = (): LabelingTemplate[] =>
  LABELING_TEMPLATES.filter((template) => template.status === "available")

const joinPath = (...parts: string[]) =>
  parts.map((part) => part.replace(/\\/g, "/").replace(/\/+$/, "")).join("/")

async function writeSampleFile(directory: string, file: SampleFile) {
  const path = joinPath(directory, file.path)
  if (file.kind === "text") await writeTextFile(path, file.content)
  else if (file.kind === "image") {
    await saveImageFile(path, sampleImageDataUrl(file.variant, file.caption))
  } else if (file.kind === "binary") await saveImageFile(path, file.dataUrl)
  else await saveImageFile(path, sampleWavDataUrl(file.variant))
}

async function seedTemplate(template: LabelingTemplate, samplesRoot: string) {
  const labelConfig = configStringForTemplate(template)
  const config = parseLabelConfig(labelConfig)
  const inferred = inferModalityTask(config)
  const task = inferred.task ?? template.task ?? "detection"
  const plan = planSampleItems(config)
  const directory = joinPath(samplesRoot, template.id)

  for (const file of plan.files) await writeSampleFile(directory, file)
  // Let the webview load the media we just wrote.
  if (plan.files.length > 0)
    await allowImageDirectory(directory).catch(() => {})

  const project = await services.getProjectService().create({
    id: crypto.randomUUID(),
    name: `${SAMPLE_NAME_PREFIX}${template.label}`,
    description: [template.description, plan.note].filter(Boolean).join(" — "),
    type: template.projectType ?? DEFAULT_PROJECT_TYPE,
    modality: inferred.modality,
    task,
    status: "active",
    settings: {
      annotationTypes:
        inferred.modality === "image"
          ? annotationTypesForTask(task)
          : (descriptorForKind(deriveConfigInfo(labelConfig).dataKind)
              ?.annotationTypes ?? annotationTypesForTask(task)),
      autoSave: true,
      labelConfig,
    },
    metadata: {
      itemCount: plan.items.length,
      sourceFolder: plan.files.length > 0 ? directory : "",
      sampleTemplateId: template.id,
    },
  })

  for (const cls of extractClasses(config)) {
    await services.getLabelService().createLabel({
      id: crypto.randomUUID(),
      name: cls.name,
      color: cls.color,
      projectId: project.id,
      project_id: project.id,
    })
  }

  const resolve = (value: SampleValue) => {
    if (typeof value === "string") return value
    if ("file" in value) return joinPath(directory, value.file)
    // A DICOM series: stored as JSON with absolute slice paths.
    return JSON.stringify({
      ...value.series,
      slices: value.series.slices.map((slice) => ({
        ...slice,
        path: joinPath(directory, slice.path),
      })),
    })
  }
  for (const item of plan.items) {
    await services.getItemService().createItem({
      id: crypto.randomUUID(),
      name: item.name,
      path: item.file ? joinPath(directory, item.file) : "",
      imagePath: item.name,
      width: item.isImage ? SAMPLE_IMAGE_SIZE.width : 0,
      height: item.isImage ? SAMPLE_IMAGE_SIZE.height : 0,
      ...(item.data
        ? {
            data: Object.fromEntries(
              Object.entries(item.data).map(([key, value]) => [
                key,
                resolve(value),
              ])
            ),
          }
        : {}),
      projectId: project.id,
      project_id: project.id,
    })
  }
}

/**
 * Seed a sample project for every template that doesn't have one yet. A
 * template that fails is reported and skipped; the rest still get created.
 */
export async function seedSampleProjects(
  onProgress?: (progress: SeedProgress) => void
): Promise<SeedSummary> {
  const templates = sampleTemplates()
  const existing = await services.getProjectService().list()
  const seeded = new Set(existing.map(sampleTemplateId).filter(Boolean))
  const samplesRoot = joinPath(await getAppDataDir(), "samples")

  const summary: SeedSummary = { created: 0, skipped: 0, failed: [] }
  for (const [index, template] of templates.entries()) {
    onProgress?.({
      done: index,
      total: templates.length,
      current: template.label,
    })
    if (seeded.has(template.id)) {
      summary.skipped++
      continue
    }
    try {
      await seedTemplate(template, samplesRoot)
      summary.created++
    } catch (error) {
      summary.failed.push({
        template: template.label,
        message: toErrorMessage(error),
      })
    }
  }
  onProgress?.({ done: templates.length, total: templates.length, current: "" })
  return summary
}

/** Delete every project the seeder created. Returns how many were removed. */
export async function removeSampleProjects(): Promise<number> {
  const projects = await services.getProjectService().list()
  const samples = projects.filter((project) => sampleTemplateId(project))
  for (const project of samples) {
    await services.getProjectService().delete(project.id)
  }
  return samples.length
}
