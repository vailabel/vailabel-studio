"use client"

import { useEffect, useState } from "react"
import { Octokit } from "@octokit/core"
import { Github } from "lucide-react"

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
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-3 py-1.5 rounded-md font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      style={{ minWidth: 110, justifyContent: "center" }}
    >
      <Github className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-200" />
      <span>Star</span>
      {stars !== null && (
        <span className="ml-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
          {stars}
        </span>
      )}
    </a>
  )
}
