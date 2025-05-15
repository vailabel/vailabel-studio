import { container, item } from "@/lib/motion"
import { motion } from "framer-motion"
import { Check, Clock } from "lucide-react"
import React from "react"

const RoadmapSection = () => {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Roadmap</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            See what's completed, in progress, and planned for future releases
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {/* Completed */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Check size={14} />
                </div>
                <h3 className="font-bold text-lg">Completed</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <p className="font-medium">Manual Annotations</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Boxes, polygons, free draw
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <p className="font-medium">Offline Storage</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Using Dexie.js
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <p className="font-medium">YOLO Export</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Standard format support
                  </p>
                </div>
              </div>
            </motion.div>

            {/* In Progress */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                  <Clock size={14} />
                </div>
                <h3 className="font-bold text-lg">In Progress</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mt-0.5">
                  <Clock size={12} />
                </div>
                <div>
                  <p className="font-medium">YOLOv8 Integration</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI-assisted labeling
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mt-0.5">
                  <Clock size={12} />
                </div>
                <div>
                  <p className="font-medium">COCO Export</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    JSON format support
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mt-0.5">
                  <Clock size={12} />
                </div>
                <div>
                  <p className="font-medium">Pascal VOC Export</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    XML format support
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Planned */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-lg">Planned</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Video Annotation</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Frame-by-frame labeling
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Team Collaboration</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Multi-user projects
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Cloud Sync</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Optional project backup
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default RoadmapSection
