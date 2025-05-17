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
        .sort()

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-background/80">
      {/* Progress bar replacement */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/80 via-primary to-primary/80" />

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] md:gap-6 lg:gap-10 py-8">
        {/* Sidebar - desktop */}
        <aside className="fixed top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block border-r md:border-r-0 pr-4 overflow-y-auto">
          <DocumentationSidebarClient docs={docs} />
        </aside>

        {/* Main content */}
        <main className="relative py-6 md:py-0">
          <Suspense>{children}</Suspense>
        </main>
      </div>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Vision AI Label Studio. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
