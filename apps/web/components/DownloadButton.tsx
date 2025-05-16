import React, { useEffect, useState } from "react"
import { ChevronDown, Laptop, Monitor, Apple } from "lucide-react"
import { getGitHubReleases } from "@/lib/api"

export type Platform = "windows" | "mac" | "linux"

const getPlatform = (): Platform => {
  if (typeof window === "undefined") return "windows"
  const platform = window.navigator.platform.toLowerCase()
  if (platform.includes("mac")) return "mac"
  if (platform.includes("win")) return "windows"
  if (platform.includes("linux")) return "linux"
  return "windows"
}

const platformIcons: Record<Platform, React.ReactNode> = {
  windows: <Monitor className="w-4 h-4" />,
  mac: <Apple className="w-4 h-4" />,
  linux: <Laptop className="w-4 h-4" />,
}

const platformLabels: Record<Platform, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
}

const DownloadButton: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>("windows")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [releaseAssets, setReleaseAssets] = useState<
    Record<Platform, string | null>
  >({
    windows: null,
    mac: null,
    linux: null,
  })

  useEffect(() => {
    setPlatform(getPlatform())
  }, [])

  useEffect(() => {
    async function fetchRelease() {
      try {
        const releases = await getGitHubReleases()
        const latest = releases[0]
        // Map asset names to platforms (customize as needed)
        const assetMap: Record<Platform, string | null> = {
          windows: null,
          mac: null,
          linux: null,
        }
        latest.assets.forEach((asset: any) => {
          if (/\.exe$/.test(asset.name))
            assetMap.windows = asset.browser_download_url
          if (/\.dmg$/.test(asset.name))
            assetMap.mac = asset.browser_download_url
          if (/\.AppImage$|\.deb$|\.tar\.gz$/.test(asset.name))
            assetMap.linux = asset.browser_download_url
        })
        setReleaseAssets(assetMap)
      } catch (e) {
        throw new Error("Failed to fetch releases")
      }
    }
    fetchRelease()
  }, [])

  return (
    <div className="relative flex items-center" style={{ minWidth: 220 }}>
      <a
        href={releaseAssets[platform] || undefined}
        className={`flex-1 px-8 py-3 rounded-l-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 min-w-0 ${!releaseAssets[platform] ? "opacity-50 pointer-events-none" : ""}`}
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        download
      >
        {platformIcons[platform]}{" "}
        <span className="truncate">
          Download for {platformLabels[platform]}
        </span>
      </a>
      <button
        type="button"
        className="h-full px-3 flex items-center justify-center rounded-r-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 border-l border-gray-300 dark:border-gray-700 z-20"
        onClick={() => setDropdownOpen((v) => !v)}
        tabIndex={0}
        aria-label="Show other platforms"
        style={{ minWidth: 44 }}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30">
          {(Object.keys(platformLabels) as Platform[])
            .filter((p) => p !== platform)
            .map((p) => (
              <a
                key={p}
                href={releaseAssets[p] || undefined}
                className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg ${!releaseAssets[p] ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => setDropdownOpen(false)}
                download
              >
                {platformIcons[p]} Download for {platformLabels[p]}
              </a>
            ))}
        </div>
      )}
    </div>
  )
}

export default DownloadButton
