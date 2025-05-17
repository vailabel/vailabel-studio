---
title: Getting Started
description: Learn how to get started with Vision AI Label Studio
category: Basics
tags: [setup, installation]
lastUpdated: May 15, 2024
---

# Getting Started

Welcome to Vision AI Label Studio! This guide will help you get up and running quickly.

## Installation

You can install Vision AI Label Studio using npm:

```bash
npm install vision-ai-label-studio
```

Or using yarn:

```bash
yarn add vision-ai-label-studio
```

## Basic Configuration

Create a configuration file in your project root:

```js
// vision-ai-config.js
export default {
  apiKey: process.env.VISION_AI_API_KEY,
  projectId: "your-project-id",
  models: ["object-detection", "segmentation"],
}
```

## Usage Example

Here's a simple example of how to use Vision AI Label Studio:

```jsx
import { VisionAIStudio } from "vision-ai-label-studio"

function App() {
  return (
    <VisionAIStudio
      projectId="your-project-id"
      images={[
        { id: "1", url: "/images/sample1.jpg" },
        { id: "2", url: "/images/sample2.jpg" },
      ]}
    />
  )
}
```

## Next Steps

After installation, check out these guides:

- [Importing Images](/documentation/importing-images)
- [Creating Labels](/documentation/creating-labels)
- [Training Models](/documentation/training-models)
