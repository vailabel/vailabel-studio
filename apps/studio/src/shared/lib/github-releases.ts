export interface GitHubReleaseAsset {
  id: number
  name: string
  browserDownloadUrl: string
  size?: number
  contentType?: string | null
}

export interface GitHubRelease {
  id: number
  tagName: string
  name: string
  draft: boolean
  prerelease: boolean
  publishedAt?: string | null
  assets: GitHubReleaseAsset[]
}

export interface GitHubReleaseSource {
  provider: "github"
  owner: string
  repo: string
}

export function githubReleaseSourceKey(source: GitHubReleaseSource) {
  return `${source.provider}:${source.owner}/${source.repo}`
}

export function normalizeReleaseTag(tagName: string) {
  return tagName.replace(/^v/i, "")
}

export function extractAssetFileName(downloadUrl: string) {
  try {
    const url = new URL(downloadUrl)
    const fileName = url.pathname.split("/").filter(Boolean).pop()
    return fileName || null
  } catch {
    return null
  }
}
