import { promises as fs } from "fs"
import path from "path"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useRouter } from "next/router"
import matter from "gray-matter"

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
    metadata = parsed.data
  } catch (error) {
    markdownContent =
      "# Blog Not Found\n\nThe requested blog could not be found."
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{metadata.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {metadata.date} • {metadata.author}
          </p>
        </header>
        <article className="prose dark:prose-invert prose-blue max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdownContent}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
