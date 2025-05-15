import { promises as fs } from "fs"
import path from "path"
import type { Metadata } from "next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
      throw new Error("File does not exist")
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
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
              >{markdownContent}</ReactMarkdown>
            </article>
          </div>
        </div>
      </main>
    </div>
  )
}
