import { promises as fs } from "fs"
import path from "path"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import ReactMarkdown from "react-markdown"

export const metadata: Metadata = {
  title: "Documentation - Vision AI Label Studio",
  description:
    "Documentation for Vision AI Label Studio - AI-Assisted Image Annotation Tool",
}

export default async function DocumentationPage() {
  // Read the markdown file from the docs directory
  let markdownContent = ""

  try {
    // Create the docs directory if it doesn't exist
    const docsDir = path.join(process.cwd(), "docs")
    try {
      await fs.mkdir(docsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, which is fine
      console.log("Docs directory already exists or couldn't be created")
    }

    const filePath = path.join(docsDir, "getting-started.md")

    // Check if the file exists, if not create it with sample content
    try {
      await fs.access(filePath)
    } catch (error) {
      // File doesn't exist, create it with sample content
      const sampleContent = `# Getting Started with Vision AI Label Studio

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
   - Windows: \`VisionAILabelStudio-win-x64.exe\`
   - macOS: \`VisionAILabelStudio-mac-x64.dmg\`
   - Linux: \`VisionAILabelStudio-linux-x64.AppImage\`
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

| Action | Shortcut |
|--------|----------|
| Save Project | Ctrl+S |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |
| Delete Selected | Delete |
| Select All | Ctrl+A |
| Box Tool | B |
| Polygon Tool | P |
| Free Draw Tool | F |
| Pan Image | Space+Drag |
| Zoom In/Out | Ctrl+Mouse Wheel |

## Next Steps

- Check out the [full documentation](/documentation) for detailed guides
- Visit our [GitHub repository](https://github.com/vision-ai-studio/vision-ai-label-studio) to contribute
- Join our [Discord community](https://discord.gg/vision-ai-studio) for support and discussions

Happy labeling!`

      await fs.writeFile(filePath, sampleContent, "utf8")
    }

    // Read the file content
    markdownContent = await fs.readFile(filePath, "utf8")
  } catch (error) {
    console.error("Error reading markdown file:", error)
    markdownContent =
      "# Error Loading Documentation\n\nSorry, there was an error loading the documentation content."
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Link
                href="/"
                className="text-xl font-bold flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                <span>Vision AI Label Studio</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Documentation</h3>
              <nav className="space-y-2">
                <a
                  href="#getting-started"
                  className="block py-2 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md"
                >
                  Getting Started
                </a>
                <a
                  href="#installation"
                  className="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Installation
                </a>
                <a
                  href="#quick-start"
                  className="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Quick Start
                </a>
                <a
                  href="#using-ai-assisted-labeling"
                  className="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  AI Labeling
                </a>
                <a
                  href="#keyboard-shortcuts"
                  className="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Keyboard Shortcuts
                </a>
                <a
                  href="#next-steps"
                  className="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Next Steps
                </a>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <article className="prose dark:prose-invert prose-blue max-w-none prose-headings:scroll-mt-24">
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </article>
          </div>
        </div>
      </main>
    </div>
  )
}
