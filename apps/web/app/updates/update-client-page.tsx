"use client"
import { useEffect, useState } from "react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import {
  getGitHubCommits,
  getGitHubReleases,
  getGitHubStarsContributorsPullRequests,
} from "@/lib/api"
import {
  GitCommit,
  Star,
  Bug,
  GitFork,
  ArrowRight,
  ExternalLink,
} from "lucide-react"
import { GithubIcon } from "@/components/icons/github-icon"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

function formatDate(dateString: string) {
  if (!dateString) return "Unknown date"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Unknown date"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export default function UpdatesPage() {
  const [releases, setReleases] = useState<any[]>([])
  const [commits, setCommits] = useState<any[]>([])
  const [stats, setStats] = useState({
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [releasesData, commitsData, starsForksData] = await Promise.all([
        getGitHubReleases(),
        getGitHubCommits(),
        getGitHubStarsContributorsPullRequests(),
      ])
      setReleases(releasesData.slice(0, 3))
      setCommits(commitsData.slice(0, 5))
      setStats(starsForksData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const buildCommitUrl = (sha: string) => {
    return `https://github.com/vailabel/vailabel-studio/commit/${sha}`
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  const statCards = [
    {
      icon: Star,
      label: "Stars",
      value: stats.stargazers_count,
      tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      icon: Bug,
      label: "Open issues",
      value: stats.open_issues_count,
      tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      icon: GitFork,
      label: "Forks",
      value: stats.forks_count,
      tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center gap-3">
          <GithubIcon size={22} className="text-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Latest updates</h1>
        </div>
        <p className="mb-10 text-muted-foreground">
          Releases and recent activity, straight from GitHub.
        </p>

        {/* Project stats */}
        <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {statCards.map((s) => (
            <Card key={s.label} className="flex items-center gap-4 p-5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.tint}`}
              >
                <s.icon size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {s.value.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Releases */}
        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <Star size={20} className="text-primary" />
            Latest releases
          </h2>
          <div className="space-y-5">
            {releases.map((release) => (
              <Card key={release.id} className="p-6">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-lg font-semibold">{release.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{release.tag_name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(release?.published_at || "")}
                    </span>
                  </div>
                </div>
                <MarkdownRenderer>{release.body}</MarkdownRenderer>
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View on GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Card>
            ))}
          </div>
        </section>

        {/* Commits */}
        <section>
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <GitCommit size={20} className="text-primary" />
            Recent commits
          </h2>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {commits.map((commit) => (
                <li
                  key={commit.sha}
                  className="p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <a
                        href={buildCommitUrl(commit.sha)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {commit.commit.message}
                      </a>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span>{commit.commit.author?.name}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {formatDate(
                            commit.commit.author?.date ?? new Date().toString()
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {commit.sha.substring(0, 7)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <div className="mt-6 text-center">
            <a
              href="https://github.com/vailabel/vailabel-studio/commits/main/"
              className={buttonVariants({ variant: "outline" })}
            >
              View all commits
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
