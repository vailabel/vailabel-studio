import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { Metadata } from "next"
import BlogSidebar from "../blog-sidebar"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { JsonLd } from "@/components/json-ld"
import { articleSchema, breadcrumbSchema } from "@/app/structured-data"

export async function generateStaticParams() {
  try {
    const blogsDir = path.join(process.cwd(), "blogs")
    const files = await fs.readdir(blogsDir)
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ slug: f.replace(/\.md$/, "") }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const blogsDir = path.join(process.cwd(), "blogs")
  const filePath = path.join(blogsDir, `${slug}.md`)

  try {
    const fileContent = await fs.readFile(filePath, "utf8")
    const parsed = matter(fileContent)
    const title = parsed.data.title || "Blog Post"
    const description =
      parsed.data.description || "Read this blog post on our site."
    const image = parsed.data.image
    return {
      title,
      description,
      alternates: { canonical: `/blogs/${slug}` },
      openGraph: {
        title,
        description,
        type: "article",
        url: `/blogs/${slug}`,
        publishedTime: parsed.data.date || undefined,
        authors: parsed.data.author ? [parsed.data.author] : undefined,
        ...(image ? { images: [{ url: image, alt: title }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    }
  } catch {
    return {
      title: "Blog Not Found",
      description: "The requested blog could not be found.",
    }
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blogsDir = path.join(process.cwd(), "blogs")
  const filePath = path.join(blogsDir, `${slug}.md`)

  let markdownContent = ""
  let metadata = { title: "", description: "", date: "", author: "", image: "" }

  try {
    const fileContent = await fs.readFile(filePath, "utf8")
    const parsed = matter(fileContent)
    markdownContent = parsed.content
    metadata = {
      title: parsed.data.title || "",
      description: parsed.data.description || "",
      date: parsed.data.date || "",
      author: parsed.data.author || "",
      image: parsed.data.image || "",
    }
  } catch (error) {
    markdownContent =
      "# Blog Not Found\n\nThe requested blog could not be found."
  }

  return (
    <div className="min-h-screen bg-background">
      {metadata.title && (
        <JsonLd
          data={[
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blogs" },
              { name: metadata.title, path: `/blogs/${slug}` },
            ]),
            articleSchema({
              type: "BlogPosting",
              title: metadata.title,
              description: metadata.description,
              path: `/blogs/${slug}`,
              image: metadata.image || undefined,
              datePublished: metadata.date || undefined,
              author: metadata.author || undefined,
            }),
          ]}
        />
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-14 sm:px-6 lg:flex-row lg:px-8">
        <main className="min-w-0 flex-1">
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {metadata.title}
            </h1>
            {metadata.description && (
              <p className="mt-2 text-lg text-muted-foreground">
                {metadata.description}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {metadata.date}
              {metadata.author ? ` • ${metadata.author}` : ""}
            </p>
          </header>
          <MarkdownRenderer>{markdownContent}</MarkdownRenderer>
        </main>
        <BlogSidebar />
      </div>
    </div>
  )
}
