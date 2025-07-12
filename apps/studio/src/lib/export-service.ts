import type { Annotation, IDBContext } from "@vailabel/core"
import JSZip from "jszip"

export class ExportService {
  private dataAccess: IDBContext

  constructor(dataAccess: IDBContext) {
    this.dataAccess = dataAccess
  }

  async exportToJson(projectId: string, filename: string): Promise<void> {
    const projects = await this.dataAccess.projects.get()
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }
    const images = (await this.dataAccess.images.get()).filter(
      (img) => img.projectId === projectId
    )
    const annotations = (await this.dataAccess.annotations.get()).filter(
      (ann) => images.some((img) => img.id === ann.imageId)
    )

    const annotationsByImage: Record<string, Annotation[]> = {}
    annotations.forEach((annotation) => {
      if (!annotationsByImage[annotation.imageId]) {
        annotationsByImage[annotation.imageId] = []
      }
      annotationsByImage[annotation.imageId].push(annotation)
    })

    const exportData = {
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        lastModified: project.updatedAt,
        imageCount: images.length,
      },
      images: images.map((img) => ({
        id: img.id,
        name: img.name,
        width: img.width || 0,
        height: img.height || 0,
        annotations: annotationsByImage[img.id] || [],
      })),
    }

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

  async exportToCoco(projectId: string, filename: string): Promise<void> {
    const projects = await this.dataAccess.projects.get()
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }
    const images = (await this.dataAccess.images.get()).filter(
      (img) => img.projectId === projectId
    )
    if (!images || images.length === 0) {
      throw new Error(`No images found for project ID ${projectId}.`)
    }
    const annotations = (await this.dataAccess.annotations.get()).filter(
      (ann) => images.some((img) => img.id === ann.imageId)
    )

    const cocoData = {
      info: {
        year: new Date().getFullYear(),
        version: "1.0",
        description: `Annotations for ${project.name}`,
        contributor: "Image Labeling App",
        date_created: new Date().toISOString(),
      },
      images: images.map((image, index) => ({
        id: index + 1,
        file_name: image.name,
        width: image.width || 0,
        height: image.height || 0,
      })),
      annotations: annotations.map((annotation, annotationIndex) => {
        const cocoAnnotation: {
          id: number
          image_id: number
          segmentation: number[][]
          area: number
          bbox: number[]
          iscrowd: number
          color: string
        } = {
          id: annotationIndex + 1,
          image_id:
            images.findIndex((img) => img.id === annotation.imageId) + 1,
          segmentation: [],
          area: 0,
          bbox: [],
          iscrowd: 0,
          color: annotation.color ?? "blue",
        }
        if (annotation.type === "box") {
          const [topLeft, bottomRight] = annotation.coordinates
          const width = bottomRight.x - topLeft.x
          const height = bottomRight.y - topLeft.y
          cocoAnnotation.bbox = [topLeft.x, topLeft.y, width, height]
          cocoAnnotation.area = width * height
        } else if (annotation.type === "polygon") {
          const flatCoords = annotation.coordinates.flatMap(
            (p: { x: number; y: number }) => [p.x, p.y]
          )
          cocoAnnotation.segmentation = [flatCoords]
          let area = 0
          for (let i = 0; i < annotation.coordinates.length; i++) {
            const j = (i + 1) % annotation.coordinates.length
            area +=
              annotation.coordinates[i].x * annotation.coordinates[j].y -
              annotation.coordinates[j].x * annotation.coordinates[i].y
          }
          cocoAnnotation.area = Math.abs(area) / 2
        }
        return cocoAnnotation
      }),
      categories: [],
    }
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

  async exportToPascalVoc(
    projectId: string,
    filenamePrefix: string
  ): Promise<void> {
    const projects = await this.dataAccess.projects.get()
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }
    const images = (await this.dataAccess.images.get()).filter(
      (img) => img.projectId === projectId
    )
    const annotations = (await this.dataAccess.annotations.get()).filter(
      (ann) => images.some((img) => img.id === ann.imageId)
    )
    const zip = new JSZip()
    images.forEach((image) => {
      const imageAnnotations = annotations.filter(
        (annotation) => annotation.imageId === image.id
      )
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<annotation>\n  <folder>${project.name}</folder>\n  <filename>${image.name}</filename>\n  <size>\n    <width>${image.width}</width>\n    <height>${image.height}</height>\n    <depth>3</depth>\n  </size>`
      imageAnnotations.forEach((annotation) => {
        xml += `\n  <object>\n    <name>${annotation.name}</name>\n    <pose>Unspecified</pose>\n    <truncated>0</truncated>\n    <difficult>0</difficult>\n    <color>${annotation.color}</color>`
        if (annotation.type === "box") {
          const [topLeft, bottomRight] = annotation.coordinates
          xml += `\n    <bndbox>\n      <xmin>${Math.round(topLeft.x)}</xmin>\n      <ymin>${Math.round(topLeft.y)}</ymin>\n      <xmax>${Math.round(bottomRight.x)}</xmax>\n      <ymax>${Math.round(bottomRight.y)}</ymax>\n    </bndbox>`
        } else if (annotation.type === "polygon") {
          xml += `\n    <polygon>`
          annotation.coordinates.forEach(
            (point: { x: number; y: number }, index: number) => {
              xml += `\n      <pt${index + 1}>\n        <x>${Math.round(point.x)}</x>\n        <y>${Math.round(point.y)}</y>\n      </pt${index + 1}>`
            }
          )
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

  async exportToYolo(projectId: string, filenamePrefix: string): Promise<void> {
    const projects = await this.dataAccess.projects.get()
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }
    const images = (await this.dataAccess.images.get()).filter(
      (img) => img.projectId === projectId
    )
    const annotations = (await this.dataAccess.annotations.get()).filter(
      (ann) => images.some((img) => img.id === ann.imageId)
    )
    const zip = new JSZip()
    images.forEach((image) => {
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
            `0 ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${norm_width.toFixed(6)} ${norm_height.toFixed(6)}`
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
}
