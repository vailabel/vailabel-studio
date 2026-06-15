"use client"

import { useEffect, useState } from "react"
import { Octokit } from "@octokit/core"
import { Star } from "lucide-react"
import { GithubIcon } from "@/components/icons/github-icon"
import { cn } from "@/lib/utils"

interface GitHubButtonProps {
  repoUrl: string
  className?: string
}

export default function GitHubButton({ repoUrl, className }: GitHubButtonProps) {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
        const res = await octokit.request("GET /repos/{owner}/{repo}", {
          owner: "vailabel",
          repo: "vailabel-studio",
        })
        setStars(res.data.stargazers_count)
      } catch {
        setStars(null)
      }
    }
    fetchStars()
  }, [repoUrl])

  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent",
        className
      )}
    >
      <GithubIcon className="h-4 w-4" />
      <span>Star</span>
      {stars !== null && (
        <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          <Star className="h-3 w-3 fill-current" />
          {stars.toLocaleString()}
        </span>
      )}
    </a>
  )
}
