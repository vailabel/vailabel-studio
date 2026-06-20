---
title: "YOLO vs COCO vs Pascal VOC: Annotation Formats Explained (and How to Choose)"
description: "A clear, practical guide to the most common image annotation export formats — YOLO, COCO, Pascal VOC, and LabelMe — with examples, trade-offs, and how to pick the right one for your training pipeline."
date: "2026-05-28"
author: "Vichea Nath"
tags: ["YOLO", "COCO", "Pascal VOC", "Annotation Formats", "Computer Vision", "Data Labeling"]
---

If you have ever finished labeling a dataset only to discover your training framework expects a *different* file format, you already know the pain. The annotations are the same boxes and polygons — but the way they are stored can make or break your pipeline.

This guide breaks down the four export formats you will run into most often — **YOLO, COCO, Pascal VOC, and LabelMe** — what they look like, where each one shines, and how to choose the right one. Every format below is a one-click export in [Vailabel Studio](/#download), so you can label once and ship to whichever framework you use.

## The quick answer

| Format | Stored as | Best for | Supports |
|--------|-----------|----------|----------|
| **YOLO** | One `.txt` per image | Training YOLO / Ultralytics models | Boxes, segmentation (YOLO-Seg) |
| **COCO** | A single `.json` for the dataset | Detectron2, MMDetection, research benchmarks | Boxes, polygons, keypoints |
| **Pascal VOC** | One `.xml` per image | Legacy pipelines, classic detectors | Boxes |
| **LabelMe** | One `.json` per image | Polygon-heavy / segmentation work | Boxes, polygons, points |

If you are training a modern YOLO model, export **YOLO**. If you are doing research or instance segmentation, export **COCO**. The rest of this article explains *why*.

## YOLO format

The YOLO format is deliberately minimal. Each image gets a matching `.txt` file where every line is one object:

```
<class_id> <x_center> <y_center> <width> <height>
```

All four coordinates are **normalized** between 0 and 1 relative to the image dimensions, which makes the labels resolution-independent:

```
0 0.514 0.382 0.220 0.341
2 0.770 0.601 0.110 0.180
```

Class names live in a separate `data.yaml` (or `classes.txt`) file, so the integers in each row map back to human-readable labels.

**Pros:** tiny files, fast to parse, the native language of the Ultralytics ecosystem (YOLOv5 through the latest releases). For segmentation, **YOLO-Seg** extends the same idea with polygon points instead of a box.

**Cons:** no built-in metadata (image source, licensing, annotation author), and one file per image means a 50,000-image dataset is 50,000 text files.

**Choose YOLO when:** you are training or fine-tuning a YOLO/Ultralytics model and want the path of least resistance.

## COCO format

COCO (Common Objects in Context) stores the **entire dataset in a single JSON file**. It is the de facto standard for object-detection research and the format most academic benchmarks are published in.

```json
{
  "images": [{ "id": 1, "file_name": "street.jpg", "width": 1280, "height": 720 }],
  "annotations": [
    {
      "id": 100,
      "image_id": 1,
      "category_id": 3,
      "bbox": [320, 210, 180, 240],
      "segmentation": [[...]],
      "area": 43200,
      "iscrowd": 0
    }
  ],
  "categories": [{ "id": 3, "name": "car" }]
}
```

Note that COCO bounding boxes are `[x, y, width, height]` in **absolute pixels** with the origin at the top-left corner — a common source of conversion bugs when moving from YOLO.

**Pros:** rich metadata, supports boxes, polygons, and keypoints in one schema, and is consumed directly by frameworks like Detectron2 and MMDetection.

**Cons:** the single-file design can get unwieldy on very large datasets, and the schema is verbose.

**Choose COCO when:** you need instance segmentation, keypoints, or you are working with research frameworks and benchmarks.

## Pascal VOC format

Pascal VOC predates both and uses **one XML file per image**:

```xml
<annotation>
  <filename>street.jpg</filename>
  <size><width>1280</width><height>720</height></size>
  <object>
    <name>car</name>
    <bndbox>
      <xmin>320</xmin><ymin>210</ymin>
      <xmax>500</xmax><ymax>450</ymax>
    </bndbox>
  </object>
</annotation>
```

Coordinates are absolute pixels expressed as corner points (`xmin, ymin, xmax, ymax`).

**Pros:** human-readable, widely supported by older tooling, and a reliable interchange format.

**Cons:** XML is heavier than text, and the format is box-centric — not ideal for segmentation.

**Choose Pascal VOC when:** a legacy pipeline or tutorial specifically asks for it.

## LabelMe format

LabelMe stores **one JSON per image** and is built around polygons, which makes it a natural fit for segmentation and irregular shapes.

**Choose LabelMe when:** your work is polygon-heavy and you want a readable, per-image record.

## How to avoid format lock-in

The biggest mistake teams make is labeling *into* a format. The moment your model architecture changes, you are stuck writing conversion scripts — and every conversion is a chance to silently flip a coordinate or drop a class.

A better approach is to keep your annotations in a single source of truth and **export to the format you need, when you need it.** That is exactly how Vailabel Studio works: you label boxes, polygons, points, and SAM masks once, then export to COCO, YOLO, YOLO-Seg, Pascal VOC, or LabelMe with a click. No scripts, no coordinate math, no lock-in.

## Get started

Pick a model, pick a format, and let the export handle the rest:

- 📥 [Download Vailabel Studio](/#download) — free, open source, Windows · macOS · Linux
- 📖 [Read the getting-started guide](/docs/getting-started)
- 🤖 [See how the offline AI copilot speeds up labeling](/blogs/auto-label-images-offline-ai-copilot)

Label once. Export anywhere.
