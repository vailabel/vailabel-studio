import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import Link from "next/link"

interface Blog {
  title: string
  description: string
  date: string
  author: string
  slug: string
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const blogsDir = path.join(process.cwd(), "blogs")
  const files = await fs.readdir(blogsDir)

  const blogs: Blog[] = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(blogsDir, file)
      const fileContent = await fs.readFile(filePath, "utf8")
      const { data } = matter(fileContent)
      return { ...data, slug: file.replace(/\.md$/, "") } as Blog
    })
  )

  const blogsPerPage = 5
  const currentPage = parseInt(searchParams.page || "1", 10)
  const totalPages = Math.ceil(blogs.length / blogsPerPage)

  const paginatedBlogs = blogs.slice(
    (currentPage - 1) * blogsPerPage,
    currentPage * blogsPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">Blogs</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedBlogs.map((blog) => (
            <div
              key={blog.slug}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{blog.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {blog.description}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{blog.date}</span> • <span>{blog.author}</span>
              </div>
              <Link
                href={`/blogs/${blog.slug}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read More
              </Link>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          {currentPage > 1 && (
            <Link
              href={`?page=${currentPage - 1}`}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md mr-2"
            >
              Previous
            </Link>
          )}
          {currentPage < totalPages && (
            <Link
              href={`?page=${currentPage + 1}`}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
