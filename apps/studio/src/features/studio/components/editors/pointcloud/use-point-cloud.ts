import { useEffect, useState } from "react"
import { allowImageDirectory, toAssetUrl } from "@/shared/lib/desktop"
import { toErrorMessage } from "@/shared/lib/errors"
import {
  decimate,
  formatOf,
  parsePointCloud,
  type PointCloud,
} from "@/features/studio/model/lib/pointcloud/point-cloud"

/** Interactive point budget; larger scans are uniformly decimated. */
const MAX_POINTS = 2_000_000

interface LoadState {
  path?: string
  cloud: PointCloud | null
  error: string | null
}

/** Load and parse an item's point cloud file (.pcd / .ply / KITTI .bin). */
export function usePointCloud(path: string | undefined) {
  const [state, setState] = useState<LoadState>({ cloud: null, error: null })

  useEffect(() => {
    if (!path) return
    let cancelled = false
    const format = formatOf(path)
    void (async () => {
      try {
        if (!format) throw new Error("Unsupported point cloud file (use .pcd, .ply or .bin).")
        const directory = path.replace(/[\\/][^\\/]*$/, "")
        if (directory) await allowImageDirectory(directory).catch(() => {})
        const buffer = await fetch(toAssetUrl(path)).then((response) => {
          if (!response.ok) throw new Error("This point cloud file could not be read.")
          return response.arrayBuffer()
        })
        const cloud = decimate(parsePointCloud(buffer, format), MAX_POINTS)
        if (!cancelled) setState({ path, cloud, error: null })
      } catch (error) {
        if (!cancelled) setState({ path, cloud: null, error: toErrorMessage(error) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [path])

  const current = state.path === path
  return {
    cloud: current ? state.cloud : null,
    error: current ? state.error : null,
    loading: !!path && !current,
  }
}
