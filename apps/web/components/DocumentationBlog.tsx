import { motion } from "framer-motion"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"
import React, { useEffect, useState } from "react"
import { getGitHubReleases } from "@/lib/api"

interface ReleaseData {
  id: number
  tag_name: string
  published_at: string
  body: string | null
}

const DocumentationBlog = () => {
  const [releaseData, setReleaseData] = useState<ReleaseData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const releases = await getGitHubReleases()
      setReleaseData(
        releases?.map((release) => ({
          id: release.id ?? 0,
          tag_name: release.tag_name ?? "",
          published_at: release.published_at
            ? new Date(release.published_at).toLocaleDateString()
            : "",
          body: release.body ?? null,
        })) ?? []
      )
    }
    fetchData()
  }, [])

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Documentation & Resources
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Everything you need to get started and make the most of Vision AI
            Label Studio
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Documentation */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Documentation</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="font-semibold">Quick Start Guide</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Get up and running in less than 5 minutes
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="font-semibold">Installation</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Step-by-step installation instructions for all platforms
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="font-semibold">Export Formats</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Learn about supported export formats and configurations
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h4 className="font-semibold">AI Integration</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    How to use YOLOv8 for auto-labeling your images
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/documentation"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View all documentation <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Blog */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Latest Updates</h3>
              <div className="space-y-6">
                {releaseData.slice(0, 2).map((update, index) => (
                  <div
                    key={update.id}
                    className="border-b border-gray-200 dark:border-gray-700 pb-4"
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {update?.published_at}
                    </div>
                    <h4 className="font-semibold text-lg">
                      {update?.tag_name}
                    </h4>
                    <span className="text-gray-600 dark:text-gray-400 mt-2">
                      <ReactMarkdown>{update?.body?.slice(0, 70)}</ReactMarkdown>
                    </span>
                  </div>
                ))}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    May 10, 2025
                  </div>
                  <h4 className="font-semibold text-lg">
                    YOLOv8 Integration Now Available
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    We've integrated YOLOv8 for AI-assisted labeling, making
                    annotation up to 5x faster.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/updates"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View all updates <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default DocumentationBlog
