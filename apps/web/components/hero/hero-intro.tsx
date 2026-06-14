"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { GithubIcon } from "@/components/icons/github-icon"
import { data } from "@/app/data"
import DownloadButton from "@/components/download-button"

export function HeroIntro() {
  return (
    <>
      <div className="flex justify-center mb-6">
        <span className="surface inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
          <Sparkles size={14} className="text-blue-500" />
          Open-source · AI-assisted · Offline-first
        </span>
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-white">
        Vision AI Label Studio
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
        Label smarter and faster with AI-assisted annotations, a clean UI, and
        full offline support.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12 relative">
        <DownloadButton />
        <motion.a
          href={data.repoUrl}
          className="surface px-8 py-3.5 rounded-xl text-gray-900 dark:text-gray-100 font-semibold hover:shadow-md transition-shadow flex items-center justify-center gap-2"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <GithubIcon size={18} /> View on GitHub
        </motion.a>
      </div>
    </>
  )
}
