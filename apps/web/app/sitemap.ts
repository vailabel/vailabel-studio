import type { MetadataRoute } from "next"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { data } from "@/app/data"

const SITE = data.productionUrl.replace(/\/$/, "")

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

async function readMarkdownEntries(dir: string) {
  try {
    const fullDir = path.join(process.cwd(), dir)
    const files = await fs.readdir(fullDir)
    return await Promise.all(
      files
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(fullDir, f), "utf8")
          const { data: fm } = matter(raw)
          return {
            slug: f.replace(/\.md$/, ""),
            date: parseDate(fm.date) ?? parseDate(fm.lastUpdated),
          }
        })
    )
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const [docs, blogs] = await Promise.all([
    readMarkdownEntries("docs"),
    readMarkdownEntries("blogs"),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/blogs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/updates`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ]

  const docRoutes: MetadataRoute.Sitemap = docs.map((d) => ({
    url: `${SITE}/docs/${d.slug}`,
    lastModified: d.date ?? now,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  const blogRoutes: MetadataRoute.Sitemap = blogs.map((b) => ({
    url: `${SITE}/blogs/${b.slug}`,
    lastModified: b.date ?? now,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  return [...staticRoutes, ...docRoutes, ...blogRoutes]
}
