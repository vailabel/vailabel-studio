import type { IDataAccess } from "./data-access"
import type { Project, Annotation } from "./types"
import JSZip from "jszip"

export class ExportService {
  private dataAccess: IDataAccess

  constructor(dataAccess: IDataAccess) {
    this.dataAccess = dataAccess
  }

  async exportToJson(projectId: string, filename: string) {
    const projects = await this.dataAccess.getProjects()
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }

    const images = await this.dataAccess.getImages(projectId)
    const annotations = await Promise.all(
      images.map((img) => this.dataAccess.getAnnotations(img.id))
    ).then((results) => results.flat())

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
        lastModified: project.lastModified,
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

  async exportToCoco(projectId: string, filename: string) {
    const projects = await this.dataAccess.getProjects()
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`)
    }

    const images = await this.dataAccess.getImages(projectId)
    if (!images || images.length === 0) {
      throw new Error(`No images found for project ID ${projectId}.`)
    }

    const annotations = await Promise.all(
      images.map((img) => this.dataAccess.getAnnotations(img.id))
    ).then((results) => results.flat())

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
          const flatCoords = annotation.coordinates.flatMap((p) => [p.x, p.y])
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

  exportToPascalVoc(
    project: Project,
    annotations: Annotation[],
    filenamePrefix: string
  ) {
    const zip = new JSZip()

    project.images?.forEach((image) => {
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
    <color>${annotation.color}</color>`
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

  exportToYolo(
    project: Project,
    annotations: Annotation[],
    filenamePrefix: string
  ) {
    const zip = new JSZip()

    project.images?.forEach((image) => {
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

  // Add other export methods (e.g., Pascal VOC, YOLO) here...
}
