import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import Link from "next/link"
import type React from "react"
import { Suspense } from "react"
import { Menu } from "lucide-react"
import { DocumentationSidebarClient } from "@/components/documentation-sidebar-client"

export default async function DocumentationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Try multiple possible locations for docs
  const possibleDocsDirs = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "app/docs"),
    path.join(process.cwd(), "public/docs"),
  ]

  let docs: Array<{ slug: string; title: string; category?: string }> = []

  // Try each possible location
  for (const docsDir of possibleDocsDirs) {
    try {
      const docFiles = (await fs.readdir(docsDir))
        .filter((f) => f.endsWith(".md"))
        .sort((a, b) => a.localeCompare(b))

      if (docFiles.length > 0) {
        docs = await Promise.all(
          docFiles.map(async (file) => {
            const filePath = path.join(docsDir, file)
            const raw = await fs.readFile(filePath, "utf8")
            const { data } = matter(raw)
            return {
              slug: file.replace(/\.md$/, ""),
              title: data.title || file.replace(/\.md$/, ""),
              category: data.category || "General",
            }
          })
        )
        break // Found docs, no need to check other directories
      }
    } catch (error) {
      // Continue to the next possible location
    }
  }

  // Group docs by category
  const docsByCategory = docs.reduce(
    (acc, doc) => {
      const category = doc.category || "General"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(doc)
      return acc
    },
    {} as Record<string, typeof docs>
  )

  // Sort categories
  const sortedCategories = Object.keys(docsByCategory).sort((a, b) => {
    if (a === "General") return -1
    if (b === "General") return 1
    return a.localeCompare(b)
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl flex-1 items-start px-4 sm:px-6 lg:px-8 md:grid md:grid-cols-[230px_minmax(0,1fr)] md:gap-10">
        <aside className="top-16 z-30 hidden h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r border-border pr-4 md:sticky md:block">
          <DocumentationSidebarClient docs={docs} />
        </aside>
        <main className="relative min-w-0 py-10">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  )
}
