import Link from "next/link"

export default function BlogsPage() {
  const blogs = [
    {
      id: 1,
      title: "Getting Started with Vision AI Label Studio",
      description:
        "Learn how to set up and use Vision AI Label Studio for your image annotation projects.",
      date: "May 10, 2025",
      author: "John Doe",
    },
    {
      id: 2,
      title: "Advanced AI-Assisted Labeling Techniques",
      description:
        "Explore advanced techniques for using AI to speed up your annotation workflow.",
      date: "May 12, 2025",
      author: "Jane Smith",
    },
    {
      id: 3,
      title: "Exporting Annotations in Multiple Formats",
      description:
        "A guide to exporting your annotations in COCO, YOLO, and Pascal VOC formats.",
      date: "May 14, 2025",
      author: "Alice Johnson",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">Blogs</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <div
              key={blog.id}
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
                href={`/blogs/${blog.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read More
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
