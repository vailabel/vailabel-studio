import { useEffect, useState } from "react"
import { getUpdaterStatus, isDesktopApp } from "@/lib/desktop"

interface UpdateProgress {
  percent: number
  transferred: number
  total: number
}

interface UpdateAvailable {
  version?: string
}

export const useAutoUpdate = () => {
  const [updateAvailable, setUpdateAvailable] =
    useState<UpdateAvailable | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    if (!isDesktopApp()) return

    getUpdaterStatus()
      .then((status) => {
        if (status.supported) {
          setUpdateAvailable({ version: "latest" })
          setProgress({
            percent: 0,
            transferred: 0,
            total: 0,
          })
          setUpdateDownloaded(false)
        } else {
          setUpdateAvailable(null)
          setProgress(null)
          setUpdateDownloaded(false)
        }
      })
      .catch(() => {
        setUpdateAvailable(null)
        setProgress(null)
        setUpdateDownloaded(false)
      })
  }, [])

  return {
    updateAvailable,
    progress,
    updateDownloaded,
  }
}
