import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import BlogSidebar from "./blog-sidebar"
import { buttonVariants } from "@/components/ui/button"

export const metadata = {
  title: "Blog",
  description:
    "Product updates, deep dives, and notes from building Vailabel Studio — data labeling, annotation, AI auto-labeling, and computer-vision workflows.",
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: "Vailabel Studio Blog",
    description:
      "Product updates, deep dives, and notes on data labeling, annotation, and computer-vision workflows.",
    url: "/blogs",
    type: "website",
  },
}

interface Blog {
  title: string
  description: string
  date: string
  author: string
  slug: string
  image?: string // Add optional image property
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const blogsDir = path.join(process.cwd(), "blogs")
  const files = (await fs.readdir(blogsDir)).filter((f) => f.endsWith(".md"))

  const blogs: Blog[] = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(blogsDir, file)
      const fileContent = await fs.readFile(filePath, "utf8")
      const { data } = matter(fileContent)
      return { ...data, slug: file.replace(/\.md$/, "") } as Blog
    })
  )

  // Newest first so fresh content surfaces at the top.
  blogs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const blogsPerPage = 5
  const currentPage = parseInt(page ?? "1", 10)
  const totalPages = Math.ceil(blogs.length / blogsPerPage)

  const paginatedBlogs = blogs.slice(
    (currentPage - 1) * blogsPerPage,
    currentPage * blogsPerPage
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-14 sm:px-6 lg:flex-row lg:px-8">
        <div className="flex-1">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Blog</h1>
          <p className="mb-10 text-muted-foreground">
            Product updates, deep dives, and notes from building {`Vailabel Studio`}.
          </p>
          <ul className="flex list-none flex-col gap-6 p-0">
            {paginatedBlogs.map((blog) => (
              <li key={blog.slug} className="group">
                <Link
                  href={`/blogs/${blog.slug}`}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:flex-row"
                >
                  {blog.image && (
                    <div className="relative h-48 w-full flex-shrink-0 overflow-hidden md:h-auto md:w-64">
                      <img
                        src={blog.image}
                        alt={blog.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6 md:p-8">
                    <h2 className="mb-2 line-clamp-2 text-xl font-semibold transition-colors group-hover:text-primary">
                      {blog.title}
                    </h2>
                    <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                      {blog.description}
                    </p>
                    <div className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {blog.date}
                      </span>
                      <span>•</span>
                      <span>{blog.author}</span>
                      <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
                        Read more
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`?page=${currentPage - 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`?page=${currentPage + 1}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Next
              </Link>
            )}
          </div>
        </div>
        <BlogSidebar />
      </div>
    </div>
  )
}
