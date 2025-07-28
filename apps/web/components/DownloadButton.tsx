"use client"

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
    <div
      className="relative flex flex-col sm:flex-row items-stretch w-full max-w-full sm:max-w-md gap-2 sm:gap-0"
      style={{ minWidth: 0 }}
    >
      <a
        href={releaseAssets[platform] || undefined}
        className={`flex-1 flex items-center justify-center px-4 py-3 sm:px-6 rounded-lg sm:rounded-l-lg sm:rounded-r-none bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition-all duration-200 gap-2 sm:gap-3 text-base sm:text-lg min-w-0 ${
          !releaseAssets[platform] ? "opacity-50 pointer-events-none" : ""
        }`}
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        download
      >
        {platformIcons[platform]}
        <span className="truncate font-semibold">Download</span>
        <span className="truncate text-white/80 text-xs sm:text-base font-normal">
          for {platformLabels[platform]}
        </span>
      </a>
      <button
        type="button"
        className="flex items-center justify-center px-4 py-3 sm:px-6 rounded-lg sm:rounded-l-none sm:rounded-r-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 gap-2 sm:gap-3 text-base sm:text-lg border-0 sm:border-l sm:border-gray-300 dark:sm:border-gray-600 z-20 min-w-0"
        onClick={() => setDropdownOpen((v) => !v)}
        tabIndex={0}
        aria-label="Show other platforms"
        style={{ minWidth: 44 }}
      >
        <ChevronDown className="w-5 h-5" />
      </button>
      {dropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-30 mx-auto animate-fade-in"
          style={{ width: "100%" }}
        >
          {(Object.keys(platformLabels) as Platform[])
            .filter((p) => p !== platform)
            .map((p) => (
              <a
                key={p}
                href={releaseAssets[p] || undefined}
                className={`flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold rounded-lg transition-all duration-200 text-base sm:text-lg min-w-0 ${
                  !releaseAssets[p] ? "opacity-50 pointer-events-none" : ""
                }`}
                onClick={() => setDropdownOpen(false)}
                download
                style={{ marginBottom: 8 }}
              >
                {platformIcons[p]}
                <span className="truncate font-semibold">Download</span>
                <span className="truncate text-gray-500 dark:text-gray-400 text-xs sm:text-base font-normal">
                  for {platformLabels[p]}
                </span>
              </a>
            ))}
        </div>
      )}
    </div>
  )
}

export default DownloadButton
