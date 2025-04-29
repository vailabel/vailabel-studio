import type { Project, Label } from "@/lib/types"

// Simple JSON export
export function exportToJson(
  project: Project,
  labels: Label[],
  filename: string
) {
  // Group labels by imageId
  const labelsByImage: Record<string, Label[]> = {}
  labels.forEach((label) => {
    if (!labelsByImage[label.imageId]) {
      labelsByImage[label.imageId] = []
    }
    labelsByImage[label.imageId].push(label)
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
      labels: labelsByImage[img.id] || [],
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
  labels: Label[],
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

  // Create a map of unique categories
  const categories = new Map()

  // Process images
  project.images.forEach((image, index) => {
    cocoData.images.push({
      id: index + 1,
      file_name: image.name,
      width: image.width,
      height: image.height,
    })

    // Find labels for this image
    const imageLabels = labels.filter((label) => label.imageId === image.id)

    // Process labels
    imageLabels.forEach((label, labelIndex) => {
      // Add category if not exists
      const category = label.category || "Uncategorized"
      if (!categories.has(category)) {
        categories.set(category, {
          id: categories.size + 1,
          name: category,
          supercategory: "none",
        })
      }

      const categoryId = categories.get(category).id

      // Create annotation
      const annotation: any = {
        id: labelIndex + 1,
        image_id: index + 1,
        category_id: categoryId,
        segmentation: [],
        area: 0,
        bbox: [],
        iscrowd: 0,
        color: label.color || "blue-500", // Include color in export
      }

      if (label.type === "box") {
        const [topLeft, bottomRight] = label.coordinates
        const width = bottomRight.x - topLeft.x
        const height = bottomRight.y - topLeft.y

        annotation.bbox = [topLeft.x, topLeft.y, width, height]
        annotation.area = width * height
      } else if (label.type === "polygon") {
        // Flatten coordinates for COCO format
        const flatCoords = label.coordinates.flatMap((p) => [p.x, p.y])
        annotation.segmentation = [flatCoords]

        // Calculate polygon area (approximate)
        let area = 0
        for (let i = 0; i < label.coordinates.length; i++) {
          const j = (i + 1) % label.coordinates.length
          area += label.coordinates[i].x * label.coordinates[j].y
          area -= label.coordinates[j].x * label.coordinates[i].y
        }
        annotation.area = Math.abs(area) / 2
      }

      cocoData.annotations.push(annotation)
    })
  })

  // Add categories to COCO data
  cocoData.categories = Array.from(categories.values())

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

// Pascal VOC XML export
export function exportToPascalVoc(
  project: Project,
  labels: Label[],
  filenamePrefix: string
) {
  // Create a zip file with all XML files
  const zip = new JSZip()

  // Process each image
  project.images.forEach((image) => {
    // Find labels for this image
    const imageLabels = labels.filter((label) => label.imageId === image.id)

    // Create XML structure
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>${project.name}</folder>
  <filename>${image.name}</filename>
  <size>
    <width>${image.width}</width>
    <height>${image.height}</height>
    <depth>3</depth>
  </size>
</annotation>`

    // Add each object
    imageLabels.forEach((label) => {
      xml += `\n  <object>
    <name>${label.name}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <color>${label.color || "blue-500"}</color>` // Include color in export

      if (label.type === "box") {
        const [topLeft, bottomRight] = label.coordinates
        xml += `\n    <bndbox>
      <xmin>${Math.round(topLeft.x)}</xmin>
      <ymin>${Math.round(topLeft.y)}</ymin>
      <xmax>${Math.round(bottomRight.x)}</xmax>
      <ymax>${Math.round(bottomRight.y)}</ymax>
    </bndbox>`
      } else if (label.type === "polygon") {
        xml += `\n    <polygon>`
        label.coordinates.forEach((point, index) => {
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

    // Add XML file to zip
    const filename = image.name.replace(/\.[^/.]+$/, "") + ".xml"
    zip.file(filename, xml)
  })

  // Generate and download zip file
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

// YOLO TXT export
export function exportToYolo(
  project: Project,
  labels: Label[],
  filenamePrefix: string
) {
  // Create a zip file with all TXT files and classes.txt
  const zip = new JSZip()

  // Create a map of unique categories
  const categories = new Map()
  labels.forEach((label) => {
    const category = label.category || label.name
    if (!categories.has(category)) {
      categories.set(category, categories.size)
    }
  })

  // Create classes.txt
  const classesText = Array.from(categories.keys()).join("\n")
  zip.file("classes.txt", classesText)

  // Create colors.txt to store color information
  const colorsMap = new Map()
  labels.forEach((label) => {
    const category = label.category || label.name
    if (!colorsMap.has(category)) {
      colorsMap.set(category, label.color || "blue-500")
    }
  })

  const colorsText = Array.from(colorsMap.entries())
    .map(([category, color]) => `${category}:${color}`)
    .join("\n")
  zip.file("colors.txt", colorsText)

  // Process each image
  project.images.forEach((image) => {
    // Find labels for this image
    const imageLabels = labels.filter((label) => label.imageId === image.id)

    // Generate YOLO format lines
    const lines: string[] = []

    imageLabels.forEach((label) => {
      if (label.type === "box") {
        const [topLeft, bottomRight] = label.coordinates
        const width = bottomRight.x - topLeft.x
        const height = bottomRight.y - topLeft.y

        // YOLO format: <class> <x_center> <y_center> <width> <height>
        // All values are normalized to [0, 1]
        const x_center = (topLeft.x + width / 2) / image.width
        const y_center = (topLeft.y + height / 2) / image.height
        const norm_width = width / image.width
        const norm_height = height / image.height

        const category = label.category || label.name
        const classId = categories.get(category)

        lines.push(
          `${classId} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${norm_width.toFixed(6)} ${norm_height.toFixed(6)}`
        )
      }
      // YOLO doesn't support polygons natively
    })

    // Add TXT file to zip
    const filename = image.name.replace(/\.[^/.]+$/, "") + ".txt"
    zip.file(filename, lines.join("\n"))
  })

  // Generate and download zip file
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

// Helper class for zip file creation (simplified mock)
class JSZip {
  private files: Map<string, string> = new Map()

  file(name: string, content: string) {
    this.files.set(name, content)
    return this
  }

  async generateAsync({ type }: { type: string }): Promise<Blob> {
    // In a real implementation, this would create a proper zip file
    // For this mock, we'll just create a text blob with file contents
    const fileList = Array.from(this.files.entries())
      .map(([name, content]) => `--- ${name} ---\n${content}\n\n`)
      .join("")

    return new Blob([fileList], { type: "application/zip" })
  }
}
