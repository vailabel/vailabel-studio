import type { Project, Label } from "@/lib/types"
import JSZip from "jszip"
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

export function exportToPascalVoc(
  project: Project,
  labels: Label[],
  filenamePrefix: string
) {
  const zip = new JSZip();

  project.images.forEach((image) => {
    const imageLabels = labels.filter((label) => label.imageId === image.id);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>${project.name}</folder>
  <filename>${image.name}</filename>
  <size>
    <width>${image.width}</width>
    <height>${image.height}</height>
    <depth>3</depth>
  </size>`;

    imageLabels.forEach((label) => {
      xml += `\n  <object>
    <name>${label.name}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <color>${label.color || "blue-500"}</color>`;
      if (label.type === "box") {
        const [topLeft, bottomRight] = label.coordinates;
        xml += `\n    <bndbox>
      <xmin>${Math.round(topLeft.x)}</xmin>
      <ymin>${Math.round(topLeft.y)}</ymin>
      <xmax>${Math.round(bottomRight.x)}</xmax>
      <ymax>${Math.round(bottomRight.y)}</ymax>
    </bndbox>`;
      } else if (label.type === "polygon") {
        xml += `\n    <polygon>`;
        label.coordinates.forEach((point, index) => {
          xml += `\n      <pt${index + 1}>
        <x>${Math.round(point.x)}</x>
        <y>${Math.round(point.y)}</y>
      </pt${index + 1}>`;
        });
        xml += `\n    </polygon>`;
      }
      xml += `\n  </object>`;
    });

    xml += `\n</annotation>`;
    const filename = image.name.replace(/\.[^/.]+$/, "") + ".xml";
    zip.file(filename, xml);
  });

  zip.generateAsync({ type: "blob" }).then((content) => {
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

export function exportToYolo(
  project: Project,
  labels: Label[],
  filenamePrefix: string
) {
  const zip = new JSZip();

  const categories = new Map();
  labels.forEach((label) => {
    const category = label.category || label.name;
    if (!categories.has(category)) {
      categories.set(category, categories.size);
    }
  });

  const classesText = Array.from(categories.keys()).join("\n");
  zip.file("classes.txt", classesText);

  const colorsMap = new Map();
  labels.forEach((label) => {
    const category = label.category || label.name;
    if (!colorsMap.has(category)) {
      colorsMap.set(category, label.color || "blue-500");
    }
  });

  const colorsText = Array.from(colorsMap.entries())
    .map(([category, color]) => `${category}:${color}`)
    .join("\n");
  zip.file("colors.txt", colorsText);

  project.images.forEach((image) => {
    const imageLabels = labels.filter((label) => label.imageId === image.id);

    const lines: string[] = [];
    imageLabels.forEach((label) => {
      if (label.type === "box") {
        const [topLeft, bottomRight] = label.coordinates;
        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        const x_center = (topLeft.x + width / 2) / image.width;
        const y_center = (topLeft.y + height / 2) / image.height;
        const norm_width = width / image.width;
        const norm_height = height / image.height;

        const category = label.category || label.name;
        const classId = categories.get(category);

        lines.push(
          `${classId} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${norm_width.toFixed(6)} ${norm_height.toFixed(6)}`
        );
      }
    });

    const filename = image.name.replace(/\.[^/.]+$/, "") + ".txt";
    zip.file(filename, lines.join("\n"));
  });

  zip.generateAsync({ type: "blob" }).then((content) => {
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
