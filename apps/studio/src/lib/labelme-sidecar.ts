import type { Annotation, ImageData } from "@/types/core"
import { readTextFile } from "@/lib/desktop"
import {
  fromLabelMe,
  sidecarPathFor,
  type LabelMeFile,
} from "@/lib/labelme-adapter"

/**
 * Read and parse an image's LabelMe sidecar (next to the image), returning
 * partial annotations ready to persist. Used to hydrate a folder on open.
 * (Writing sidecars goes through the unified exporter in `@/lib/export`.)
 */
export async function importLabelMeSidecar(
  image: ImageData,
  projectId?: string
): Promise<Array<Partial<Annotation>>> {
  if (!image.path) return []
  const contents = await readTextFile(sidecarPathFor(image.path))
  if (!contents) return []
  try {
    const file = JSON.parse(contents) as LabelMeFile
    return fromLabelMe(file, image, projectId)
  } catch {
    return []
  }
}
