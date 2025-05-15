---
title: "Getting Started with Vision AI Label Studio"
description: "A guide to help you quickly get started with Vision AI Label Studio, an open-source image annotation tool."
date: "2025-05-15"
author: "Vision AI Team"
tags: ["AI", "Labeling", "YOLOv8", "Image Annotation"]
---

# Getting Started with Vision AI Label Studio

Welcome to Vision AI Label Studio, a powerful open-source tool for image annotation with AI assistance. This guide will help you get started quickly.

## What is Vision AI Label Studio?

Vision AI Label Studio is a comprehensive image labeling tool designed for computer vision tasks. It combines manual annotation capabilities with AI-assisted labeling powered by YOLOv8 to make your annotation workflow faster and more efficient.

## Key Features

- **Manual Annotations**: Create bounding boxes, polygons, and free-form drawings
- **AI-Assisted Labeling**: Leverage YOLOv8 to automatically detect and label objects
- **Offline Support**: Work without an internet connection using local storage
- **Multiple Export Formats**: Export to COCO, YOLO, Pascal VOC, and JSON
- **Cross-Platform**: Available for Windows, macOS, and Linux
- **Responsive UI**: Includes light and dark mode support

## Installation

### System Requirements

- Operating System: Windows 10+, macOS 10.15+, or Linux
- RAM: 4GB minimum (8GB recommended)
- Disk Space: 500MB for the application
- GPU: Optional but recommended for AI-assisted labeling

### Download and Install

1. Visit the [releases page](https://github.com/vision-ai-studio/vision-ai-label-studio/releases) on GitHub
2. Download the appropriate version for your operating system:
   - Windows: `VisionAILabelStudio-win-x64.exe`
   - macOS: `VisionAILabelStudio-mac-x64.dmg`
   - Linux: `VisionAILabelStudio-linux-x64.AppImage`
3. Run the installer and follow the on-screen instructions

### Quick Installation via Package Managers

**macOS (Homebrew)**:
\`\`\`bash
brew install vision-ai-label-studio
\`\`\`

**Linux (Snap)**:
\`\`\`bash
sudo snap install vision-ai-label-studio
\`\`\`

## Quick Start

1. **Launch the application** after installation
2. **Create a new project** by clicking "New Project" on the home screen
3. **Import images** by clicking "Add Images" and selecting files from your computer
4. **Define labels** by clicking "Manage Labels" and adding the categories you need
5. **Start annotating** by selecting a label and drawing on the image
6. **Save your work** regularly using the "Save" button (Ctrl+S)
7. **Export annotations** when finished by clicking "Export" and selecting your preferred format

## Using AI-Assisted Labeling

1. Enable AI assistance by toggling the "AI Assist" button in the toolbar
2. Select a pre-trained YOLOv8 model or import your custom model
3. Adjust confidence threshold using the slider (default: 0.5)
4. Click "Auto-Label" to generate annotations for the current image
5. Review and edit the AI-generated annotations as needed

## Keyboard Shortcuts

| Action          | Shortcut         |
| --------------- | ---------------- |
| Save Project    | Ctrl+S           |
| Undo            | Ctrl+Z           |
| Redo            | Ctrl+Y           |
| Delete Selected | Delete           |
| Select All      | Ctrl+A           |
| Box Tool        | B                |
| Polygon Tool    | P                |
| Free Draw Tool  | F                |
| Pan Image       | Space+Drag       |
| Zoom In/Out     | Ctrl+Mouse Wheel |

## Next Steps

- Check out the [full documentation](/documentation) for detailed guides
- Visit our [GitHub repository](https://github.com/vision-ai-studio/vision-ai-label-studio) to contribute
- Join our [Discord community](https://discord.gg/vision-ai-studio) for support and discussions

Happy labeling!
