import { useEffect, useState } from "react"

export interface UpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export interface UpdateInfo {
  version?: string
  [key: string]: unknown
}

export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(
    null
  )
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    // @ts-expect-error electronAPI is injected by preload
    const electronAPI = window.electronAPI
    if (!electronAPI) return
    electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(info)
    })
    electronAPI.onDownloadProgress((progress: UpdateProgress) => {
      setProgress(progress)
    })
    electronAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
    })
  }, [])

  return { updateAvailable, progress, updateDownloaded }
}
