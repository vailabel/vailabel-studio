For Tairui, I'd separate it into **Desktop Layer**, **Core Domain Layer**, and **AI Runtime Layer**.

## High-Level Architecture

```text id="6rf6n1"
Tairui
│
├── UI Layer (React)
│
├── Application Layer (Rust)
│
├── Domain Layer (Rust)
│
├── Infrastructure Layer (Rust)
│
└── AI Runtime Layer (Python)
```

---

# Workspace Structure

```text id="ul6o4k"
apps/
└── studio
    ├── src
    └── src-tauri

crates/
├── core
├── project
├── annotation
├── dataset
├── training
├── copilot
├── models
├── search
├── jobs
└── shared

python-runtime/
├── api
├── training
├── inference
├── export
└── models
```

---

# React Side

```text id="hdv6kc"
src/
├── features
│
├── project
├── annotation
├── dataset
├── training
├── copilot
├── models
│
├── shared
├── layouts
├── hooks
├── services
└── routes
```

Feature-based organization.

---

# Rust Backend

```text id="3j9gka"
src-tauri/
│
├── commands
├── events
├── state
└── bootstrap
```

Only Tauri-specific code lives here.

---

# Core Domain

```text id="5x68q8"
core/
├── entities
├── value_objects
├── domain_events
├── repositories
└── errors
```

Contains no database code.

Example:

```rust id="6wv58r"
Project
Dataset
ImageAsset
Annotation
LabelClass
ModelArtifact
TrainingRun
```

---

# Dataset Module

```text id="5f4q7t"
dataset/
├── application
├── domain
├── infrastructure
└── api
```

Responsibilities:

```text id="p6j2om"
Import
Export
Validation
Statistics
Duplicate Detection
```

---

# Annotation Module

```text id="qozq4g"
annotation/
├── application
├── domain
├── infrastructure
└── api
```

Entities:

```text id="d9ch5e"
BoundingBox
Polygon
Mask
Keypoint
Classification
```

---

# Copilot Module

```text id="rkow6s"
copilot/
├── application
├── tools
├── providers
├── prompts
└── api
```

Tools:

```text id="7fx7ut"
FindDuplicatesTool
AutoLabelTool
DatasetSummaryTool
AnnotationStatsTool
SearchTool
```

---

# Training Module

```text id="k5e2d0"
training/
├── application
├── domain
├── infrastructure
├── process
└── api
```

Handles:

```text id="25vqaq"
Training Jobs
Experiments
Metrics
Logs
Export
```

---

# Model Manager

```text id="ov91i8"
models/
├── application
├── domain
├── providers
└── infrastructure
```

Responsibilities:

```text id="9m9y5m"
Download
Install
Update
Delete
Verify
```

Models:

```text id="m3d0vl"
Grounding DINO
SAM2
YOLO
RT-DETR
Qwen
PaddleOCR
```

---

# Search Module

```text id="ybxkrd"
search/
├── embeddings
├── vector_store
├── application
└── api
```

Supports:

```text id="m0d9l6"
CLIP
Image Search
Text Search
Duplicate Search
```

---

# Python Runtime

Keep all ML work here.

```text id="lwr1xg"
python-runtime/
│
├── app.py
│
├── routers
│   ├── training.py
│   ├── inference.py
│   └── export.py
│
├── services
│   ├── yolo_service.py
│   ├── rtdetr_service.py
│   ├── sam_service.py
│   └── qwen_service.py
│
├── jobs
│   ├── train_yolo.py
│   ├── train_rtdetr.py
│   └── export_onnx.py
│
└── models
```

---

# Communication

```text id="2i9j93"
React
   │
Tauri Command
   │
Rust Service
   │
HTTP
   │
FastAPI
   │
PyTorch
```

Example:

```text id="1bgj4g"
User clicks Train

React
 -> invoke("start_training")

Rust
 -> POST /training/start

FastAPI
 -> launch training job

Rust
 -> stream logs

React
 -> live dashboard
```

---

# Database

SQLite initially.

Core tables:

```text id="nsb5h4"
projects
datasets
images
annotations
classes

models
model_versions

training_runs
training_metrics

copilot_sessions
copilot_messages
```

---

# Future Plugin Architecture

```text id="04b1zj"
plugins/

plugins/yolo
plugins/sam2
plugins/ocr
plugins/export-coco
plugins/export-yolo
```

Every AI capability should be a plugin.

Then later users can install:

* Custom detectors
* Custom OCR
* Custom exporters
* Custom training pipelines

without modifying Tairui.

---

If your goal is **"Roboflow but local-first and open source"**, the core modules should be:

```text id="nqwd4k"
Project
Dataset
Annotation
Search
Models
Copilot
Training
```

Everything else (OCR, YOLO, SAM2, exports, QA, active learning) plugs into those six domains. This keeps the architecture manageable even as Tairui grows.
