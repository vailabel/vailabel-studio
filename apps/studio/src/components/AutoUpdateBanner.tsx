import React from "react"
import { Progress } from "@/components/ui/progress"
import { useAutoUpdate } from "@/ipc/useAutoUpdate"

export function AutoUpdateBanner() {
  const { updateAvailable, progress, updateDownloaded } = useAutoUpdate()

  if (!updateAvailable && !progress && !updateDownloaded) return null

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-blue-600 text-white shadow-lg flex flex-col items-center p-2 animate-in fade-in">
      {updateAvailable && (
        <div className="mb-1">
          Update available: {updateAvailable.version || "New version"} is being
          downloaded...
        </div>
      )}
      {progress && (
        <div className="w-full max-w-md">
          <Progress value={progress.percent} />
          <div className="text-xs mt-1 text-center">
            Downloading: {progress.percent?.toFixed(1)}% (
            {(progress.transferred / 1024 / 1024).toFixed(2)} MB /{" "}
            {(progress.total / 1024 / 1024).toFixed(2)} MB)
          </div>
        </div>
      )}
      {updateDownloaded && (
        <div className="mt-1 font-semibold">
          Update downloaded! Restart the app to apply the update.
        </div>
      )}
    </div>
  )
}
