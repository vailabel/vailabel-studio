# Tairui Roadmap

> **Vision:** Open-source, local-first AI data annotation platform combining LabelMe, CVAT, and LM Studio concepts into a single desktop application.

---

# Phase 0 - Foundation (MVP)

**Goal:** Become a viable LabelMe alternative.

## Project Management

* [x] Create Project
* [x] Open Existing Project
* [x] Recent Projects
* [x] Import Dataset Folder
* [x] Export Project
* [ ] Project Settings

## Annotation

* [x] Bounding Box
* [x] Polygon
* [x] Polyline
* [x] Point
* [x] Circle
* [ ] Brush Segmentation
* [ ] Rotated Bounding Box

## Label Management

* [x] Create Label
* [x] Label Colors
* [ ] Label Groups
* [ ] Label Shortcuts
* [ ] Label Validation

## Dataset Browser

* [ ] Folder Tree
* [x] Image Grid View
* [ ] Image Metadata
* [ ] Filter By Label
* [x] Filter By Status

## File Formats

* [x] LabelMe JSON
* [x] COCO Detection
* [x] COCO Segmentation
* [x] YOLO Detection
* [x] YOLO Segmentation
* [x] Pascal VOC

## Productivity

* [x] Undo / Redo
* [ ] Auto Save
* [x] Keyboard Shortcuts
* [x] Zoom / Pan
* [x] Dark Theme

---

# Phase 1 - Local AI Assistant

**Goal:** AI-assisted annotation.

## AI Runtime

* [ ] Model Manager
* [ ] Download Models
* [ ] Local Model Registry
* [ ] GPU Detection
* [ ] ONNX Runtime Support

## Supported Models

* [ ] SAM2
* [ ] MobileSAM
* [ ] Grounding DINO
* [ ] Florence-2
* [ ] YOLO World
* [ ] CLIP

## Smart Annotation

* [ ] Click-To-Segment
* [ ] Prompt-To-Detect
* [ ] Auto Polygon Generation
* [ ] Auto Bounding Box
* [ ] Batch Auto Labeling

Example:

```text
Find all cars
```

↓

```text
YOLO World
```

↓

```text
SAM2
```

↓

```text
Annotations Created
```

---

# Phase 2 - Dataset Intelligence

**Goal:** Understand dataset quality.

## Analytics

* [ ] Class Distribution
* [ ] Label Distribution
* [ ] Image Statistics
* [ ] Resolution Statistics

## Quality Detection

* [ ] Missing Labels
* [ ] Empty Annotations
* [ ] Invalid Polygons
* [ ] Corrupted Images

## Data Quality

* [ ] Blur Detection
* [ ] Overexposure Detection
* [ ] Underexposure Detection
* [ ] Low Resolution Detection

## Outlier Detection

* [ ] Embedding Outliers
* [ ] Rare Classes
* [ ] Suspicious Labels

---

# Phase 3 - Semantic Search

**Goal:** Search images by meaning.

## Vector Search

* [ ] CLIP Embedding Generation
* [ ] Embedding Cache
* [ ] Background Indexing

## Search Features

* [ ] Text Search
* [ ] Image Search
* [ ] Similar Image Search
* [ ] Label Search

Example:

```text
Red truck
```

```text
Person wearing helmet
```

```text
Forklift inside warehouse
```

## Search Engine

* [ ] SQLite-VSS
* [ ] LanceDB
* [ ] Qdrant Support

---

# Phase 4 - Dataset Cleanup

**Goal:** Prepare clean training datasets.

## Duplicate Detection

* [ ] Exact Duplicates
* [ ] Near Duplicates
* [ ] Similar Images
* [ ] Screenshot Detection

## Dataset Optimization

* [ ] Remove Duplicates
* [ ] Merge Similar Labels
* [ ] Find Orphan Labels
* [ ] Label Consistency Check

## Smart Suggestions

* [ ] Suggested Labels
* [ ] Suggested Merges
* [ ] Suggested Cleanup Actions

---

# Phase 5 - Video Annotation

**Goal:** Support computer vision datasets.

## Video Management

* [ ] Import Video
* [ ] Frame Extraction
* [ ] Scene Detection

## Video Labeling

* [ ] Object Tracking
* [ ] Track Interpolation
* [ ] Keyframe Labeling

## Video Search

* [ ] Search By Frame
* [ ] Search Similar Frames
* [ ] Find Scene Changes

---

# Phase 6 - Dataset Copilot

**Goal:** LM Studio for datasets.

## Local LLM Integration

* [ ] Ollama Support
* [ ] llama.cpp Support
* [ ] OpenAI-Compatible APIs

## Dataset Chat

Ask:

```text
Show me damaged vehicles
```

```text
Find images missing labels
```

```text
Which classes need more examples?
```

```text
Find all images similar to this one
```

## Agent Workflows

* [ ] Auto Review Dataset
* [ ] Auto Label Dataset
* [ ] Auto Cleanup Dataset
* [ ] Auto Generate Reports

---

# Phase 7 - Training Studio

**Goal:** Train models directly inside Tairui.

## Training

* [ ] YOLO Training
* [ ] RT-DETR Training
* [ ] Segmentation Training

## Experiment Tracking

* [ ] Metrics Dashboard
* [ ] Training Logs
* [ ] Model Comparison

## Export

* [ ] ONNX
* [ ] TensorRT
* [ ] OpenVINO

---

# Phase 8 - Enterprise Features

**Goal:** Team collaboration.

## Multi User

* [ ] User Management
* [ ] Roles
* [ ] Permissions

## Workflow

* [ ] Review Queue
* [ ] Approval Workflow
* [ ] Annotation Assignment

## Audit

* [ ] Change History
* [ ] Annotation History
* [ ] Dataset Versioning

---

# Future Vision

```text
Tairui
│
├── Annotation
├── Dataset Management
├── AI Assisted Labeling
├── Semantic Search
├── Dataset Intelligence
├── Dataset Copilot
├── Video Labeling
├── Training Studio
└── Team Collaboration
```

**Target Positioning**

| Product    | Purpose                            |
| ---------- | ---------------------------------- |
| LabelMe    | Manual annotation                  |
| CVAT       | Team annotation                    |
| LM Studio  | Local AI models                    |
| **Tairui** | AI-native dataset operating system |

The key differentiator should be: **local AI + semantic search + dataset intelligence**, not just annotation. That's where most existing tools are still weak.
