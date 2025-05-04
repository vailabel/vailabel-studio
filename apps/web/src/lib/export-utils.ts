import type { Project, Annotation } from "@/lib/types"
import JSZip from "jszip"
// Simple JSON export
export function exportToJson(
  project: Project,
  annotations: Annotation[],
  filename: string
) {
  // Group annotations by imageId
  const annotationsByImage: Record<string, Annotation[]> = {}
  annotations.forEach((annotation) => {
    if (!annotationsByImage[annotation.imageId]) {
      annotationsByImage[annotation.imageId] = []
    }
    annotationsByImage[annotation.imageId].push(annotation)
  })

  // Create export data structure
  const exportData = {
    project: {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      lastModified: project.lastModified,
      imageCount: project.images.length,
    },
    images: project.images.map((img) => ({
      id: img.id,
      name: img.name,
      width: img.width,
      height: img.height,
      annotations: annotationsByImage[img.id] || [],
    })),
  }

  // Convert to JSON and download
  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// COCO JSON export
export function exportToCoco(
  project: Project,
  annotations: Annotation[],
  filename: string
) {
  // COCO format structure
  const cocoData = {
    info: {
      year: new Date().getFullYear(),
      version: "1.0",
      description: `Annotations for ${project.name}`,
      contributor: "Image Labeling App",
      date_created: new Date().toISOString(),
    },
    images: [] as any[],
    annotations: [] as any[],
    categories: [] as any[],
  }

  // Process images
  project.images.forEach((image, index) => {
    cocoData.images.push({
      id: index + 1,
      file_name: image.name,
      width: image.width,
      height: image.height,
    })

    // Find annotations for this image
    const imageAnnotations = annotations.filter(
      (annotation) => annotation.imageId === image.id
    )

    // Process annotations
    imageAnnotations.forEach((annotation, annotationIndex) => {
      // Create annotation
      const cocoAnnotation: any = {
        id: annotationIndex + 1,
        image_id: index + 1,
        segmentation: [],
        area: 0,
        bbox: [],
        iscrowd: 0,
        color: annotation.color || "blue-500", // Include color in export
      }

      if (annotation.type === "box") {
        const [topLeft, bottomRight] = annotation.coordinates
        const width = bottomRight.x - topLeft.x
        const height = bottomRight.y - topLeft.y

        cocoAnnotation.bbox = [topLeft.x, topLeft.y, width, height]
        cocoAnnotation.area = width * height
      } else if (annotation.type === "polygon") {
        // Flatten coordinates for COCO format
        const flatCoords = annotation.coordinates.flatMap((p) => [p.x, p.y])
        cocoAnnotation.segmentation = [flatCoords]

        // Calculate polygon area (approximate)
        let area = 0
        for (let i = 0; i < annotation.coordinates.length; i++) {
          const j = (i + 1) % annotation.coordinates.length
          area += annotation.coordinates[i].x * annotation.coordinates[j].y
          area -= annotation.coordinates[j].x * annotation.coordinates[i].y
        }
        cocoAnnotation.area = Math.abs(area) / 2
      }

      cocoData.annotations.push(cocoAnnotation)
    })
  })

  // Convert to JSON and download
  const jsonStr = JSON.stringify(cocoData, null, 2)
  const blob = new Blob([jsonStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToPascalVoc(
  project: Project,
  annotations: Annotation[],
  filenamePrefix: string
) {
  const zip = new JSZip()

  project.images.forEach((image) => {
    const imageAnnotations = annotations.filter(
      (annotation) => annotation.imageId === image.id
    )

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>${project.name}</folder>
  <filename>${image.name}</filename>
  <size>
    <width>${image.width}</width>
    <height>${image.height}</height>
    <depth>3</depth>
  </size>`

    imageAnnotations.forEach((annotation) => {
      xml += `\n  <object>
    <name>${annotation.name}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <color>${annotation.color || "blue-500"}</color>`
      if (annotation.type === "box") {
        const [topLeft, bottomRight] = annotation.coordinates
        xml += `\n    <bndbox>
      <xmin>${Math.round(topLeft.x)}</xmin>
      <ymin>${Math.round(topLeft.y)}</ymin>
      <xmax>${Math.round(bottomRight.x)}</xmax>
      <ymax>${Math.round(bottomRight.y)}</ymax>
    </bndbox>`
      } else if (annotation.type === "polygon") {
        xml += `\n    <polygon>`
        annotation.coordinates.forEach((point, index) => {
          xml += `\n      <pt${index + 1}>
        <x>${Math.round(point.x)}</x>
        <y>${Math.round(point.y)}</y>
      </pt${index + 1}>`
        })
        xml += `\n    </polygon>`
      }
      xml += `\n  </object>`
    })

    xml += `\n</annotation>`
    const filename = image.name.replace(/\.[^/.]+$/, "") + ".xml"
    zip.file(filename, xml)
  })

  zip.generateAsync({ type: "blob" }).then((content) => {
    const url = URL.createObjectURL(content)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filenamePrefix}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

export function exportToYolo(
  project: Project,
  annotations: Annotation[],
  filenamePrefix: string
) {
  const zip = new JSZip()

  project.images.forEach((image) => {
    const imageAnnotations = annotations.filter(
      (annotation) => annotation.imageId === image.id
    )

    const lines: string[] = []
    imageAnnotations.forEach((annotation) => {
      if (annotation.type === "box") {
        const [topLeft, bottomRight] = annotation.coordinates
        const width = bottomRight.x - topLeft.x
        const height = bottomRight.y - topLeft.y

        const x_center = (topLeft.x + width / 2) / image.width
        const y_center = (topLeft.y + height / 2) / image.height
        const norm_width = width / image.width
        const norm_height = height / image.height

        lines.push(
          `0 ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${norm_width.toFixed(
            6
          )} ${norm_height.toFixed(6)}`
        )
      }
    })

    const filename = image.name.replace(/\.[^/.]+$/, "") + ".txt"
    zip.file(filename, lines.join("\n"))
  })

  zip.generateAsync({ type: "blob" }).then((content) => {
    const url = URL.createObjectURL(content)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filenamePrefix}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}
