"use client"

import { useEffect, useState } from "react"
import { Octokit } from "@octokit/core"
import { Github } from "lucide-react"
import { motion } from "framer-motion"

interface GitHubButtonProps {
  repoUrl: string
}

export default function GitHubButton({ repoUrl }: GitHubButtonProps) {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    const fetchStars = async () => {
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      })
      const res = await octokit.request("GET /repos/{owner}/{repo}", {
        owner: "vailabel",
        repo: "vailabel-studio",
      })

      setStars(res.data.stargazers_count)
    }

    fetchStars()
  }, [repoUrl])

  return (
    <motion.a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
      >
        <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </motion.div>
      <span className="font-medium">Star</span>
      {stars !== null && (
        <motion.span
          className="text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          ({stars})
        </motion.span>
      )}
    </motion.a>
  )
}
