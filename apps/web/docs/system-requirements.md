---
title: System Requirements
description: Minimum and recommended hardware and operating system requirements for running Vision AI Label Studio, including optional GPU requirements for AI features.
category: Basics
tags: [setup, installation, requirements, gpu]
lastUpdated: June 14, 2026
---

# System Requirements

Vision AI Label Studio is a local-first desktop application. The core labeling
experience is lightweight and runs comfortably on most modern machines. The
**optional AI features** (automatic detection, segmentation, and the offline
copilot) benefit greatly from a GPU but also work on CPU.

## Operating system

| Platform | Supported versions |
|---|---|
| **Windows** | Windows 10 or Windows 11 (64-bit) |
| **macOS** | macOS 11 Big Sur or later (Apple Silicon and Intel) |

> See the [desktop installation guide](/docs/install-on-desktop) for how to get
> past the unsigned-app warning on each platform.

## Hardware

| Component | Minimum | Recommended |
|---|---|---|
| **CPU** | 64-bit dual-core | Quad-core or better |
| **RAM** | 4 GB | 8 GB+ (16 GB for large datasets or AI) |
| **Disk** | ~500 MB for the app | Extra space for your images and projects |
| **Display** | 1280 × 720 | 1920 × 1080 or higher |

Your projects, images, and annotations are stored locally, so plan disk space
around the size of your image datasets.

## Optional: GPU for AI acceleration

The AI features run through **ONNX Runtime**. They will run on CPU out of the
box, but an NVIDIA GPU makes detection and segmentation dramatically faster.

| Requirement | Details |
|---|---|
| **GPU** | NVIDIA GPU with up-to-date drivers |
| **CUDA** | CUDA 12 runtime |
| **cuDNN** | cuDNN 9 (for CUDA 12) |
| **Extra disk** | ~1 GB for the downloaded GPU runtime + cuDNN |

The app can download and install the GPU runtime for you (Windows) — see the
[AI & GPU setup guide](/docs/ai-gpu-setup) for the full walkthrough and
troubleshooting. To learn what the AI features do, see the
[AI Copilot guide](/docs/ai-copilot).

> **No GPU?** That's fine — AI detection still works on CPU, just slower. You can
> add a GPU runtime later at any time.
