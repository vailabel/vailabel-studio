import { useState } from "react"
import { appDataDir } from "@tauri-apps/api/path"
import { toast } from "sonner"
import type { ImageData } from "@/shared/types/core"
import type { CloudBatchResult, CloudConnectionRef } from "@/shared/ipc/cloud"
import { allowImageDirectory } from "@/shared/lib/desktop"
import { services } from "@/shared/services"
import { useCloudStorageViewModel } from "@/shared/model/cloud-storage-viewmodel"
import type { ProjectStorageConfig } from "@/shared/types/project-config"

/** Object key for a project image in the bucket. Uses the project's custom
 *  prefix when set, otherwise falls back to the conventional default. */
const imageKey = (
  projectId: string,
  name: string,
  prefix?: string
): string => {
  const base = prefix ?? `projects/${projectId}/images/`
  return `${base.replace(/\/?$/, "/")}${name}`
}

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
 *
 * Resolution order: project's own `storageConfig.connectionId` → global active
 * connection → null (local only).
 */
export const useProjectCloudSync = (
  projectId: string,
  images: ImageData[],
  onAfterPull?: () => void,
  storageConfig?: ProjectStorageConfig
) => {
  const { configs, activeConfig } = useCloudStorageViewModel()
  const [isSyncing, setIsSyncing] = useState(false)

  // Prefer the per-project connection; fall back to the global active one.
  const resolvedConfig =
    (storageConfig?.connectionId
      ? configs.find((c) => c.id === storageConfig.connectionId)
      : undefined) ?? activeConfig

  const connectionRef: CloudConnectionRef | null = resolvedConfig
    ? {
        configId: resolvedConfig.id,
        provider: resolvedConfig.provider,
        config: resolvedConfig.config,
      }
    : null

  const prefix = storageConfig?.prefix

  const pushToCloud = async () => {
    if (!connectionRef || isSyncing) return
    setIsSyncing(true)
    try {
      const items = images
        .filter((image) => image.path)
        .map((image) => ({
          key: imageKey(projectId, image.name, prefix),
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
        key: imageKey(projectId, image.name, prefix),
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

  return { activeConfig: resolvedConfig, isSyncing, pushToCloud, pullFromCloud }
}
