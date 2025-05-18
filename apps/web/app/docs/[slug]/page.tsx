import { promises as fs } from "fs"
import path from "path"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Calendar, Tag } from "lucide-react"
import { AnimatedLayout } from "@/components/animated-layout"
import { MarkdownRenderer } from "@/components/markdown-renderer"

import matter from "gray-matter"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Try multiple possible locations for docs
  const possibleDocsDirs = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "app/docs"),
    path.join(process.cwd(), "public/docs"),
  ]

  let docsDir = ""
  let fileExists = false

  // Try to find the file in each possible location
  for (const dir of possibleDocsDirs) {
    const filePath = path.join(dir, `${slug}.md`)
    try {
      await fs.access(filePath)
      docsDir = dir
      fileExists = true
      break
    } catch {
      // File not found in this directory, try the next one
    }
  }

  if (!fileExists) {
    notFound()
  }

  const filePath = path.join(docsDir, `${slug}.md`)

  try {
    const raw = await fs.readFile(filePath, "utf8")
    const { data } = matter(raw)
    return {
      title: `${data.title || slug} - Documentation`,
      description:
        data.description || `Documentation for ${data.title || slug}`,
    }
  } catch (error) {
    return {
      title: "Documentation",
      description: "Documentation page",
    }
  }
}

export default async function DocDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Try multiple possible locations for docs
  const possibleDocsDirs = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "app/docs"),
    path.join(process.cwd(), "public/docs"),
  ]

  let docsDir = ""
  let fileExists = false

  // Try to find the file in each possible location
  for (const dir of possibleDocsDirs) {
    const filePath = path.join(dir, `${slug}.md`)
    try {
      await fs.access(filePath)
      docsDir = dir
      fileExists = true
      break
    } catch {
      // File not found in this directory, try the next one
    }
  }

  if (!fileExists) {
    notFound()
  }

  const filePath = path.join(docsDir, `${slug}.md`)
  let content = ""
  let title = slug
  let description = ""
  let tags: string[] = []
  let lastUpdated = ""

  try {
    const raw = await fs.readFile(filePath, "utf8")
    const { data, content: mdContent } = matter(raw)
    content = mdContent
    title = data.title || slug
    description = data.description || ""
    tags = data.tags || []
    lastUpdated = data.lastUpdated || ""
  } catch (error) {
    notFound()
  }

  // Get all docs for navigation
  let docFiles: string[] = []
  let docs: Array<{ slug: string; title: string; category?: string }> = []
  let currentIndex = 0

  try {
    docFiles = (await fs.readdir(docsDir))
      .filter((f) => f.endsWith(".md"))
      .sort()

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

    currentIndex = docs.findIndex((doc) => doc.slug === slug)
  } catch {}

  const prevDoc = docs[currentIndex - 1]
  const nextDoc = docs[currentIndex + 1]

  return (
    <AnimatedLayout>
      <div className="w-full max-w-3xl mx-auto">
        {/* Document header */}
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            {title}
          </h1>

          {description && (
            <p className="text-lg text-muted-foreground">{description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {lastUpdated && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Updated: {lastUpdated}</span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs border border-primary/30 rounded px-2 py-0.5 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Main content */}
        <article className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-img:rounded-lg prose-img:shadow-md prose-a:text-primary hover:prose-a:text-primary/80 prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:pl-6 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 dark:prose-pre:bg-zinc-900/90 prose-pre:text-zinc-50 prose-pre:rounded-lg prose-pre:p-4 prose-pre:shadow-sm">
          <MarkdownRenderer content={content} />
        </article>

        {/* Navigation footer */}
        <div className="flex justify-between mt-12 pt-6 border-t">
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.slug}`}
              className="inline-flex items-center gap-2 group border border-gray-200 dark:border-gray-700 rounded px-4 py-2 text-sm font-medium bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>{prevDoc.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.slug}`}
              className="inline-flex items-center gap-2 group rounded px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary/80 transition"
            >
              <span>{nextDoc.title}</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </AnimatedLayout>
  )
}
