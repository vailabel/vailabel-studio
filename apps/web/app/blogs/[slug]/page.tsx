import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { Metadata } from "next"
import BlogSidebar from "../BlogSidebar"
import { MarkdownRenderer } from "@/components/markdown-renderer"

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const { slug } = params
  const blogsDir = path.join(process.cwd(), "blogs")
  const filePath = path.join(blogsDir, `${slug}.md`)

  try {
    const fileContent = await fs.readFile(filePath, "utf8")
    const parsed = matter(fileContent)
    const { title, description } = parsed.data
    return {
      title: title || "Blog Post",
      description: description || "Read this blog post on our site.",
      openGraph: {
        title: title || "Blog Post",
        description: description || "Read this blog post on our site.",
        type: "article",
        url: `/blogs/${slug}`,
      },
      twitter: {
        card: "summary_large_image",
        title: title || "Blog Post",
        description: description || "Read this blog post on our site.",
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
  params: { slug: string }
}) {
  const { slug } = params
  const blogsDir = path.join(process.cwd(), "blogs")
  const filePath = path.join(blogsDir, `${slug}.md`)

  let markdownContent = ""
  let metadata = { title: "", description: "", date: "", author: "" }

  try {
    const fileContent = await fs.readFile(filePath, "utf8")
    const parsed = matter(fileContent)
    markdownContent = parsed.content
    metadata = {
      title: parsed.data.title || "",
      description: parsed.data.description || "",
      date: parsed.data.date || "",
      author: parsed.data.author || "",
    }
  } catch (error) {
    markdownContent =
      "# Blog Not Found\n\nThe requested blog could not be found."
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-12">
        <main className="flex-1">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{metadata.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {metadata.date} • {metadata.author}
            </p>
          </header>
          <MarkdownRenderer>{markdownContent}</MarkdownRenderer>
        </main>
        <BlogSidebar />
      </div>
    </div>
  )
}
