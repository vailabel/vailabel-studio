---
title: Importing Images
description: Learn how to import and manage images in Vision AI Label Studio
category: Basics
tags: [images, import]
lastUpdated: May 14, 2024
---

# Importing Images

Vision AI Label Studio supports multiple ways to import images for annotation.

## From Local Files

You can import images from your local file system:

1. Click the "Import" button in the top navigation
2. Select "From Local Files"
3. Choose the images you want to import
4. Click "Import"

## From URLs

To import images from URLs:

1. Click the "Import" button
2. Select "From URLs"
3. Enter the URLs of the images (one per line)
4. Click "Import"

## From Cloud Storage

Vision AI Label Studio supports importing from various cloud storage providers:

### Amazon S3

```jsx
import { S3Importer } from "vision-ai-label-studio/importers"

;<S3Importer bucket="your-bucket-name" prefix="images/" region="us-west-2" />
```

### Google Cloud Storage

```jsx
import { GCSImporter } from "vision-ai-label-studio/importers"

;<GCSImporter bucket="your-bucket-name" prefix="images/" />
```

## Batch Processing

For large datasets, you can use batch processing to import images in chunks:

```jsx
import { BatchImporter } from "vision-ai-label-studio/importers"

;<BatchImporter
  source="https://api.yourdomain.com/images"
  batchSize={100}
  maxBatches={10}
/>
```

## Next Steps

After importing your images, you might want to:

- [Create Labels](/documentation/creating-labels)
- [Set Up Annotation Guidelines](/documentation/annotation-guidelines)
