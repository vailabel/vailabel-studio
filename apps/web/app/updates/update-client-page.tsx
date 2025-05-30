"use client"
import { useEffect, useState } from "react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import {
  getGitHubCommits,
  getGitHubReleases,
  getGitHubStarsContributorsPullRequests,
} from "@/lib/api"
import { Github, GitCommit, Star, Bug, GitFork, ArrowRight } from "lucide-react"

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
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Github size={24} className="text-gray-700 dark:text-gray-300" />
            <h1 className="text-3xl font-bold">Latest Updates</h1>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Star size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats.stargazers_count}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Stars</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Bug size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats.open_issues_count}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Open Issues
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
                <GitFork size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.forks_count}</div>
                <div className="text-gray-600 dark:text-gray-400">Forks</div>
              </div>
            </div>
          </div>

          {/* Releases */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Star size={24} />
              Latest Releases
            </h2>
            <div className="space-y-6">
              {releases.map((release) => (
                <div
                  key={release.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-xl font-bold">{release.name}</h3>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm px-3 py-1 rounded-full">
                        {release.tag_name}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        {formatDate(release?.published_at || "")}
                      </span>
                    </div>
                  </div>
                  <MarkdownRenderer>{release.body}</MarkdownRenderer>

                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
                  >
                    View on GitHub
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
                        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* Commits */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <GitCommit size={24} />
              Recent Commits
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {commits.map((commit) => (
                  <li
                    key={commit.sha}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <a
                          href={buildCommitUrl(commit.sha)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {commit.commit.message}
                        </a>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span>{commit.commit.author?.name}</span>
                          <span className="mx-2">•</span>
                          <span>
                            {formatDate(
                              commit.commit.author?.date ??
                                new Date().toString()
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0 text-gray-500 dark:text-gray-400 text-sm font-mono">
                        {commit.sha.substring(0, 7)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 text-center">
              <a
                href={
                  "https://github.com/vailabel/vailabel-studio/commits/main/"
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 transition-colors"
              >
                View all commits
                <ArrowRight size={16} />
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
