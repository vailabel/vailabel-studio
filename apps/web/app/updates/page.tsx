import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  Github,
  GitCommit,
  GitPullRequest,
  Star,
  GitMerge,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Latest Updates - Vision AI Label Studio",
  description: "Latest updates and releases for Vision AI Label Studio",
}

// GitHub API types
type GitHubRelease = {
  id: number
  name: string
  tag_name: string
  published_at: string
  body: string
  html_url: string
}

type GitHubCommit = {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  html_url: string
}

async function getGitHubReleases() {
  // Replace with your actual GitHub repo
  const res = await fetch(
    "https://api.github.com/repos/vailabel/vailabel-studio/releases",
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        // Add GitHub token if needed for higher rate limits
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
      next: { revalidate: 3600 }, // Revalidate every hour
    }
  )

  if (!res.ok) {
    // Return mock data if the API call fails
    return getMockReleases()
  }

  return res.json()
}

async function getGitHubCommits() {
  // Replace with your actual GitHub repo
  const res = await fetch(
    "https://api.github.com/repos/vailabel/vailabel-studio/commits",
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        // Add GitHub token if needed for higher rate limits
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
      next: { revalidate: 3600 }, // Revalidate every hour
    }
  )

  if (!res.ok) {
    // Return mock data if the API call fails
    return getMockCommits()
  }

  return res.json()
}

// Mock data in case the API call fails
function getMockReleases(): GitHubRelease[] {
  return [
    {
      id: 1,
      name: "Version 1.2.0",
      tag_name: "v1.2.0",
      published_at: "2025-05-10T12:00:00Z",
      body: "Added YOLOv8 integration for AI-assisted labeling, making annotation up to 5x faster.",
      html_url: "#",
    },
    {
      id: 2,
      name: "Version 1.1.0",
      tag_name: "v1.1.0",
      published_at: "2025-04-22T12:00:00Z",
      body: "Added support for Pascal VOC and COCO JSON export formats.",
      html_url: "#",
    },
    {
      id: 3,
      name: "Version 1.0.0",
      tag_name: "v1.0.0",
      published_at: "2025-03-15T12:00:00Z",
      body: "First stable release with core annotation features and offline storage.",
      html_url: "#",
    },
  ]
}

function getMockCommits(): GitHubCommit[] {
  return [
    {
      sha: "abc123",
      commit: {
        message: "Implement YOLOv8 integration for auto-labeling",
        author: {
          name: "Jane Developer",
          date: "2025-05-09T10:30:00Z",
        },
      },
      html_url: "#",
    },
    {
      sha: "def456",
      commit: {
        message: "Fix polygon drawing tool precision issues",
        author: {
          name: "John Contributor",
          date: "2025-05-07T14:15:00Z",
        },
      },
      html_url: "#",
    },
    {
      sha: "ghi789",
      commit: {
        message: "Add COCO JSON export format",
        author: {
          name: "Alex Maintainer",
          date: "2025-04-20T09:45:00Z",
        },
      },
      html_url: "#",
    },
    {
      sha: "jkl012",
      commit: {
        message: "Improve offline storage reliability with Dexie.js",
        author: {
          name: "Sam Coder",
          date: "2025-04-15T16:20:00Z",
        },
      },
      html_url: "#",
    },
    {
      sha: "mno345",
      commit: {
        message: "Add dark mode support",
        author: {
          name: "Taylor Designer",
          date: "2025-04-10T11:05:00Z",
        },
      },
      html_url: "#",
    },
  ]
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export default async function UpdatesPage() {
  // Fetch data in parallel
  const [releasesData, commitsData] = await Promise.all([
    getGitHubReleases(),
    getGitHubCommits(),
  ])

  const releases = releasesData.slice(0, 3) // Get latest 3 releases
  const commits = commitsData.slice(0, 5) // Get latest 5 commits

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Link
                href="/"
                className="text-xl font-bold flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                <span>Vision AI Label Studio</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

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
                <div className="text-2xl font-bold">1,245</div>
                <div className="text-gray-600 dark:text-gray-400">Stars</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                <GitPullRequest size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">87</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Pull Requests
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
                <GitMerge size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold">342</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Contributors
                </div>
              </div>
            </div>
          </div>

          {/* Releases */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
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
                        {formatDate(release.published_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {release.body}
                  </p>
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
                          href={commit.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {commit.commit.message}
                        </a>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span>{commit.commit.author.name}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(commit.commit.author.date)}</span>
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
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 transition-colors"
              >
                View all commits
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
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
