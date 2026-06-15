"use client"

import React, { useEffect, useState } from "react"
import { ChevronDown, Apple, Monitor, Laptop, Download } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { getGitHubReleases } from "@/lib/api"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  windows: <Monitor className="h-4 w-4" />,
  mac: <Apple className="h-4 w-4" />,
  linux: <Laptop className="h-4 w-4" />,
}

const platformLabels: Record<Platform, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
}

const DownloadButton: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>("windows")
  const [assets, setAssets] = useState<Record<Platform, string | null>>({
    windows: null,
    mac: null,
    linux: null,
  })

  useEffect(() => setPlatform(getPlatform()), [])

  useEffect(() => {
    async function fetchRelease() {
      try {
        const releases = await getGitHubReleases()
        const latest = releases[0]
        const map: Record<Platform, string | null> = {
          windows: null,
          mac: null,
          linux: null,
        }
        latest.assets.forEach((asset: { name: string; browser_download_url: string }) => {
          if (/\.exe$/.test(asset.name)) map.windows = asset.browser_download_url
          if (/\.dmg$/.test(asset.name)) map.mac = asset.browser_download_url
          if (/amd64\.deb$/.test(asset.name))
            map.linux = asset.browser_download_url
          else if (!map.linux && /\.AppImage$|\.tar\.gz$/.test(asset.name))
            map.linux = asset.browser_download_url
        })
        setAssets(map)
      } catch {
        /* releases unavailable — buttons fall back to the repo */
      }
    }
    fetchRelease()
  }, [])

  const href = assets[platform] || undefined
  const others = (Object.keys(platformLabels) as Platform[]).filter(
    (p) => p !== platform
  )

  return (
    <div className="inline-flex items-stretch">
      <a
        href={href}
        download
        className={cn(
          buttonVariants({ size: "lg", className: "rounded-r-none" }),
          !href && "pointer-events-none opacity-60"
        )}
      >
        <Download className="h-4 w-4" />
        Download for {platformLabels[platform]}
      </a>
      <Popover.Root>
        <Popover.Trigger
          aria-label="Other platforms"
          className={buttonVariants({
            size: "lg",
            className: "rounded-l-none border-l border-primary-foreground/20 px-3",
          })}
        >
          <ChevronDown className="h-4 w-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={8}>
            <Popover.Popup className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl animate-fade-in">
              {others.map((p) => (
                <a
                  key={p}
                  href={assets[p] || undefined}
                  download
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    !assets[p] && "pointer-events-none opacity-50"
                  )}
                >
                  {platformIcons[p]}
                  Download for {platformLabels[p]}
                </a>
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

export default DownloadButton
