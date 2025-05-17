---
title: Advanced Features
description: Explore the advanced features of Vision AI Label Studio
category: Features
tags: [advanced, ai, automation]
lastUpdated: May 16, 2024
---

# Advanced Features

Vision AI Label Studio offers several advanced features to enhance your image annotation workflow.

## AI-Assisted Labeling

Our AI-assisted labeling feature can significantly speed up your annotation process:

1. Pre-annotate images with AI models
2. Review and correct AI-generated annotations
3. Train custom models on your dataset

### Configuration

Enable AI-assisted labeling in your project settings:

```jsx
import { AIAssistConfig } from "vision-ai-label-studio/ai"

;<AIAssistConfig
  enabled={true}
  models={["object-detection", "segmentation"]}
  confidence={0.7}
/>
```

## Batch Processing

Process large datasets efficiently with our batch processing tools:

- Automatically split datasets into manageable batches
- Apply the same annotations to similar images
- Track progress across batches

## Custom Annotation Types

Create custom annotation types for specialized use cases:

```jsx
import { defineAnnotationType } from "vision-ai-label-studio/types"

const customPolygon = defineAnnotationType({
  name: "custom-polygon",
  displayName: "Custom Polygon",
  properties: {
    color: { type: "color", default: "#FF5733" },
    confidence: { type: "number", min: 0, max: 1 },
    notes: { type: "text" },
  },
  renderer: CustomPolygonRenderer,
  editor: CustomPolygonEditor,
})
```

## Keyboard Shortcuts

Improve efficiency with keyboard shortcuts:

| Shortcut | Action             |
| -------- | ------------------ |
| `A`      | Add new annotation |
| `S`      | Select tool        |
| `D`      | Delete selected    |
| `R`      | Rectangle tool     |
| `P`      | Polygon tool       |
| `Ctrl+Z` | Undo               |
| `Ctrl+Y` | Redo               |

## Export Options

Export your annotations in various formats:

- COCO JSON
- YOLO
- Pascal VOC
- Custom formats via plugins

## Next Steps

Learn more about:

- [Team Collaboration](/documentation/team-collaboration)
- [API Integration](/documentation/api-integration)
- [Custom Plugins](/documentation/custom-plugins)
