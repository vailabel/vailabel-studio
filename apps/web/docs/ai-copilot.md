---
title: AI Copilot (Offline)
description: An offline, on-device AI copilot that helps you label faster — detect, segment, caption, and QA — running entirely on local models with no cloud calls.
category: Basics
tags: [ai, copilot, offline, detection, segmentation]
lastUpdated: June 14, 2026
---

# AI Copilot (Offline)

The AI Copilot is an **offline, on-device assistant** that helps you label
faster. It can *see* the current image, answer questions about it, and take
labeling actions — all running locally with **no cloud calls** and no data
leaving your machine.

> **Privacy first.** Inference runs entirely on your computer through the same
> local [ONNX Runtime](/docs/ai-gpu-setup) stack as automatic detection. Your
> images are never uploaded.

## What it can do

The copilot turns a chat request into a labeling action and lands the result in
the existing review panel, where you accept or reject each suggestion:

- **Detect** objects and draw bounding boxes (e.g. "detect all the cars").
- **Segment** objects into masks.
- **Caption** an image or describe what's in it.
- **QA** your existing annotations and flag likely mistakes.

> **Human-in-the-loop by default.** The copilot *proposes*; you *dispose*.
> AI-generated boxes and masks arrive as predictions you review, and any change
> to existing data goes through an approve/deny step.

### Availability

Capabilities roll out as their models ship. Object detection and segmentation
are available today; richer describe/caption/QA capabilities are being added.
Each model shows its status on the **AI Models** page.

## Requirements

The copilot reuses the same runtime as automatic detection, so the setup is the
same:

1. **ONNX Runtime** — installed automatically or manually. See the
   [AI & GPU setup guide](/docs/ai-gpu-setup).
2. **An NVIDIA GPU is optional but recommended** for responsive results. CPU
   works, just slower. See [System Requirements](/docs/system-requirements).
3. **Models** — download the models you want to use from the **AI Models** page
   inside the app. They are cached locally for offline use.

## Getting started

1. Open a project and select an image.
2. Make sure **AI Models → Inference Runtime** shows `ONNX Runtime: Loaded`.
3. Open the copilot chat and ask it to do something, e.g.
   *"detect all the people in this image"*.
4. Review the suggested annotations and accept the ones you want.

If nothing happens when you ask the copilot to detect, the runtime probably
isn't loaded — head to the [AI & GPU setup guide](/docs/ai-gpu-setup) and check
the Inference Runtime panel.
