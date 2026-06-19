import type { Annotation, Item } from "@/shared/types/core"
import type { Label } from "@/shared/types/core"
import {
  annotationBBox,
  flattenPolygon,
  isPolygonal,
  polygonArea,
} from "./geometry"
import { buildCategoryIndex } from "./categories"

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Build a COCO dataset object covering both detection (bbox) and segmentation
 * (polygon) — polygonal shapes carry a `segmentation`, everything else just a
 * bbox. Image and annotation ids are 1-based per the COCO spec.
 */
export function toCoco(
  images: Item[],
  annotationsByImage: Map<string, Annotation[]>,
  labels: Label[]
): object {
  const allAnnotations = images.flatMap(
    (image) => annotationsByImage.get(image.id) || []
  )
  const categoryIndex = buildCategoryIndex(labels, allAnnotations)

  const categories = categoryIndex.names.map((name, index) => ({
    id: index + 1,
    name,
    supercategory: "",
  }))

  const cocoImages: object[] = []
  const cocoAnnotations: object[] = []
  let annotationId = 1

  images.forEach((image, imageIndex) => {
    const itemId = imageIndex + 1
    cocoImages.push({
      id: itemId,
      file_name: image.imagePath || image.name,
      width: image.width,
      height: image.height,
    })

    for (const annotation of annotationsByImage.get(image.id) || []) {
      const bbox = annotationBBox(annotation)
      if (!bbox) continue

      const categoryId = categoryIndex.indexOf(annotation.name) + 1
      if (categoryId <= 0) continue

      const polygonal = isPolygonal(annotation)
      cocoAnnotations.push({
        id: annotationId,
        item_id: itemId,
        category_id: categoryId,
        bbox: [round(bbox.x), round(bbox.y), round(bbox.width), round(bbox.height)],
        area: round(
          polygonal ? polygonArea(annotation.coordinates) : bbox.width * bbox.height
        ),
        segmentation: polygonal ? [flattenPolygon(annotation.coordinates).map(round)] : [],
        iscrowd: 0,
      })
      annotationId += 1
    }
  })

  return {
    info: {
      description: "Exported from Vailabel Studio",
      version: "1.0",
      date_created: new Date().toISOString(),
    },
    licenses: [],
    images: cocoImages,
    annotations: cocoAnnotations,
    categories,
  }
}
