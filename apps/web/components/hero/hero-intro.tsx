"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { GithubIcon } from "@/components/icons/github-icon"
import { data } from "@/app/data"
import DownloadButton from "@/components/download-button"

export function HeroIntro() {
  return (
    <>
      <div className="flex justify-center mb-6">
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
          <Sparkles size={14} className="text-indigo-500" />
          Open-source · AI-assisted · Offline-first
        </span>
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
        <span className="text-gradient">Vision AI Label Studio</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
        Label smarter and faster with AI-assisted annotations, a beautiful UI,
        and full offline support.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12 relative">
        <motion.a
          href={data.productionUrl}
          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow flex items-center justify-center gap-2"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          Get Started <ArrowRight size={18} />
        </motion.a>
        <DownloadButton />
        <motion.a
          href={data.repoUrl}
          className="glass px-8 py-3.5 rounded-xl text-gray-900 dark:text-gray-100 font-semibold hover:shadow-md transition-shadow flex items-center justify-center gap-2"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <GithubIcon size={18} /> View on GitHub
        </motion.a>
      </div>
    </>
  )
}
