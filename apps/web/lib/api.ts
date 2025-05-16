import { Octokit } from "@octokit/core"
export type GitHubRelease = {
  id: number
  name: string | null
  tag_name?: string
  published_at: string | null
  body?: string | null
  html_url?: string
  assets?: Array<{
    name: string
    browser_download_url: string
  }>
}

export type GitHubCommit = {
  sha: string
  commit: {
    message: string
    author: {
      name?: string
      date?: string
    } | null
  }
}

export async function getGitHubReleases() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  const res = await octokit.request("GET /repos/{owner}/{repo}/releases", {
    owner: "vailabel",
    repo: "vailabel-studio",
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  return res.data.map((release: any) => {
    return {
      id: release.id,
      name: release.name,
      tag_name: release.tag_name,
      published_at: release.published_at,
      body: release.body,
      html_url: release.html_url,
      assets: release.assets,
    }
  })
}

export async function getGitHubStarsContributorsPullRequests() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })
  const res = await octokit.request("GET /repos/{owner}/{repo}", {
    owner: "vailabel",
    repo: "vailabel-studio",
  })
  return res.data
}

export async function getGitHubCommits() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  const res = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner: "vailabel",
    repo: "vailabel-studio",
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  return res.data.map((commit: GitHubCommit) => {
    return {
      sha: commit.sha,
      commit: {
        message: commit.commit.message,
        author: commit.commit.author,
      },
    }
  })
}
