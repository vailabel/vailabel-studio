import { useState } from "react"
import { appDataDir } from "@tauri-apps/api/path"
import { toast } from "sonner"
import type { ImageData } from "@/shared/types/core"
import type { CloudBatchResult, CloudConnectionRef } from "@/shared/ipc/cloud"
import { allowImageDirectory } from "@/shared/lib/desktop"
import { services } from "@/shared/services"
import { useCloudStorageViewModel } from "@/shared/model/cloud-storage-viewmodel"

/** Object key for a project image in the bucket. Stable, so re-syncs overwrite. */
const imageKey = (projectId: string, name: string) =>
  `projects/${projectId}/images/${name}`

const toForwardSlashes = (path: string) => path.replace(/\\/g, "/")

const summarize = (action: string, result: CloudBatchResult) => {
  const ok = result.succeeded.length
  const failed = result.failed.length
  if (failed === 0) {
    toast.success(`${action} complete`, {
      description: `${ok} image${ok === 1 ? "" : "s"} synced.`,
    })
  } else {
    toast.warning(`${action} finished with errors`, {
      description: `${ok} synced, ${failed} failed. First error: ${
        result.failed[0]?.error ?? "unknown"
      }`,
    })
  }
}

/**
 * Project-level cloud sync, backed by the Rust cloud commands. Push uploads the
 * project's referenced image files to the active bucket; pull downloads them to
 * a local cache dir and re-points each image's path so the canvas renders them
 * (the recovery path when local files are missing on another machine).
 */
export const useProjectCloudSync = (
  projectId: string,
  images: ImageData[],
  onAfterPull?: () => void
) => {
  const { activeConfig } = useCloudStorageViewModel()
  const [isSyncing, setIsSyncing] = useState(false)

  const connectionRef: CloudConnectionRef | null = activeConfig
    ? {
        configId: activeConfig.id,
        provider: activeConfig.provider,
        config: activeConfig.config,
      }
    : null

  const pushToCloud = async () => {
    if (!connectionRef || isSyncing) return
    setIsSyncing(true)
    try {
      const items = images
        .filter((image) => image.path)
        .map((image) => ({
          key: imageKey(projectId, image.name),
          path: image.path,
        }))
      if (items.length === 0) {
        toast.info("Nothing to push", { description: "No images in this project." })
        return
      }
      const result = await services
        .getCloudStorageService()
        .uploadFiles(connectionRef, items)
      summarize("Push", result)
    } catch (error) {
      toast.error("Push failed", { description: String(error) })
    } finally {
      setIsSyncing(false)
    }
  }

  const pullFromCloud = async () => {
    if (!connectionRef || isSyncing) return
    setIsSyncing(true)
    try {
      const cacheDir = toForwardSlashes(
        `${await appDataDir()}/cloud-cache/${projectId}`
      )
      const destinations = images.map((image) => ({
        image,
        key: imageKey(projectId, image.name),
        path: `${cacheDir}/${image.name}`,
      }))
      const result = await services
        .getCloudStorageService()
        .downloadFiles(
          connectionRef,
          destinations.map(({ key, path }) => ({ key, path }))
        )

      // Grant the asset protocol access to the cache, then re-point the images
      // that were successfully downloaded so they render from the local cache.
      await allowImageDirectory(cacheDir)
      const succeeded = new Set(result.succeeded)
      await Promise.all(
        destinations
          .filter(({ key }) => succeeded.has(key))
          .map(({ image, path }) =>
            services.getImageService().updateImage(image.id, { path })
          )
      )
      summarize("Pull", result)
      onAfterPull?.()
    } catch (error) {
      toast.error("Pull failed", { description: String(error) })
    } finally {
      setIsSyncing(false)
    }
  }

  return { activeConfig, isSyncing, pushToCloud, pullFromCloud }
}
