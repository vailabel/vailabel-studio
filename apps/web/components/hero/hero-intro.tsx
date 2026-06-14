"use client"

import { motion } from "framer-motion"
import { ArrowRight, Github } from "lucide-react"
import { data } from "@/app/data"
import DownloadButton from "@/components/download-button"

export function HeroIntro() {
  return (
    <>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
        Vision AI Label Studio
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8">
        Label smarter and faster with AI-assisted annotations, beautiful UI, and
        full offline support.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 relative">
        <motion.a
          href={data.productionUrl}
          className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Get Started <ArrowRight size={18} />
        </motion.a>
        <DownloadButton />
        <motion.a
          href={data.repoUrl}
          className="px-8 py-3 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Github size={18} /> View on GitHub
        </motion.a>
      </div>
    </>
  )
}
