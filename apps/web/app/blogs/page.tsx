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
  image?: string // Add optional image property
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-8 text-center lg:text-left">
            Blogs
          </h1>
          <ul className="flex flex-col gap-10 list-none p-0">
            {paginatedBlogs.map((blog) => (
              <li
                key={blog.slug}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-0 hover:shadow-2xl transition-shadow flex flex-col md:flex-row overflow-hidden border border-gray-100 dark:border-gray-700 group"
              >
                {blog.image && (
                  <div className="md:w-64 w-full h-48 md:h-auto flex-shrink-0 overflow-hidden relative">
                    <img
                      src={blog.image}
                      alt={blog.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                <div className="flex flex-col flex-1 p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {blog.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 text-base">
                    {blog.description}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full font-medium">
                      {blog.date}
                    </span>
                    <span>•</span>
                    <span className="font-medium">{blog.author}</span>
                  </div>
                  <div className="mt-auto">
                    <Link
                      href={`/blogs/${blog.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white dark:bg-blue-500 dark:text-white font-semibold shadow hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      Read More
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.25 6.75L21 10.5m0 0l-3.75 3.75M21 10.5H3"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="sticky top-24 flex flex-col gap-8">
            {/* Advertisement Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-300 dark:from-blue-700 dark:to-blue-500 p-6 shadow-lg flex flex-col items-center text-center">
              <span className="uppercase text-xs font-bold tracking-widest text-white/80 mb-2">
                Sponsored
              </span>
              <div className="text-white text-lg font-semibold mb-2">
                Try Vision AI Label Studio
              </div>
              <div className="text-white/90 text-sm mb-4">
                Boost your AI projects with advanced annotation tools and team
                collaboration.
              </div>
              <a
                href="https://vailabel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 py-2 rounded-lg bg-white text-blue-700 font-bold shadow hover:bg-blue-100 transition-colors mb-2"
              >
                Learn More
              </a>
              <a
                href="mailto:nathvichea1@gmail.com"
                className="inline-block px-5 py-2 rounded-lg bg-blue-700 text-white font-bold shadow hover:bg-blue-800 transition-colors mt-2"
              >
                Contact Us
              </a>
            </div>
            {/* Download Button */}
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow flex flex-col items-center">
              <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Download Desktop App
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm mb-4 text-center">
                Get the full power of Vision AI Label Studio on your computer.
              </div>
              <a
                href="https://github.com/vailabel/vailabel-studio/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-colors"
              >
                Download Now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
