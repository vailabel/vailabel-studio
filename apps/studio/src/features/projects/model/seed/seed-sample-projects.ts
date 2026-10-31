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
import { scanDicomFolder } from "@/shared/lib/dicom/scan"
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

// Creates one ready-to-label project per template in the catalog, each with a
// few real, openly licensed items (bundled under public/samples), so every
// labeling type can be tried without hunting for data. Safe to run again:
// templates that already have a sample are skipped.

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

/** A bundled sample file as a data URL. Templates share files, so each is
 *  fetched and encoded once per seeding run. */
type AssetCache = Map<string, Promise<string>>

function bundledDataUrl(asset: string, cache: AssetCache): Promise<string> {
  let pending = cache.get(asset)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}samples/${asset}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Missing sample file ${asset}`)
        return response.blob()
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          })
      )
    cache.set(asset, pending)
  }
  return pending
}

async function writeSampleFile(
  directory: string,
  file: SampleFile,
  cache: AssetCache
) {
  const path = joinPath(directory, file.path)
  if (file.kind === "text") await writeTextFile(path, file.content)
  else await saveImageFile(path, await bundledDataUrl(file.asset, cache))
}

async function seedTemplate(
  template: LabelingTemplate,
  samplesRoot: string,
  cache: AssetCache
) {
  const labelConfig = configStringForTemplate(template)
  const config = parseLabelConfig(labelConfig)
  const inferred = inferModalityTask(config)
  const task = inferred.task ?? template.task ?? "detection"
  const plan = planSampleItems(
    config,
    [template.id, template.label, template.description].join(" ")
  )
  const directory = joinPath(samplesRoot, template.id)

  for (const file of plan.files) await writeSampleFile(directory, file, cache)
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

  const resolve = async (value: SampleValue) => {
    if (typeof value === "string") return value
    if ("file" in value) return joinPath(directory, value.file)
    // A DICOM series: read back from the slices just written, stored as JSON
    // with absolute slice paths (what the "series" import mode produces).
    const [series] = await scanDicomFolder(
      joinPath(directory, value.dicomFolder)
    )
    if (!series) throw new Error(`No DICOM series in ${value.dicomFolder}`)
    return JSON.stringify(series)
  }
  for (const item of plan.items) {
    const path = item.file ? joinPath(directory, item.file) : ""
    // Video-tracking projects keep clips in the video store, not as items.
    if (inferred.modality === "video" && item.video) {
      await services.getVideoService().import({
        projectId: project.id,
        name: item.name,
        path,
        ...item.video,
      })
      continue
    }
    const data = item.data
      ? Object.fromEntries(
          await Promise.all(
            Object.entries(item.data).map(
              async ([key, value]) => [key, await resolve(value)] as const
            )
          )
        )
      : undefined
    await services.getItemService().createItem({
      id: crypto.randomUUID(),
      name: item.name,
      path,
      imagePath: item.name,
      width: item.width ?? 0,
      height: item.height ?? 0,
      ...(data ? { data } : {}),
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

  const cache: AssetCache = new Map()

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
      await seedTemplate(template, samplesRoot, cache)
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
