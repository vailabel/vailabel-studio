import { allowImageDirectory, listFiles, toAssetUrl } from "@/shared/lib/desktop"
import { groupSeries, readSliceInfo, type DicomSeries, type DicomSliceInfo } from "./dicom"

/** Headers are read from the first bytes of each file (full read on a miss). */
const HEADER_BYTES = 128 * 1024
const CONCURRENCY = 8

async function readBytes(path: string, headerOnly: boolean): Promise<Uint8Array> {
  const response = await fetch(toAssetUrl(path), {
    headers: headerOnly ? { Range: `bytes=0-${HEADER_BYTES - 1}` } : undefined,
  })
  if (!response.ok) throw new Error(`Could not read ${path}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function sliceInfo(path: string): Promise<DicomSliceInfo | null> {
  try {
    return (
      readSliceInfo(path, await readBytes(path, true)) ??
      readSliceInfo(path, await readBytes(path, false))
    )
  } catch {
    return null
  }
}

/**
 * Find the DICOM series in a folder (and its sub-folders): every file's header
 * is read, non-DICOM files are skipped, and slices are grouped per series.
 */
export async function scanDicomFolder(folder: string): Promise<DicomSeries[]> {
  await allowImageDirectory(folder)
  const paths = await listFiles(folder, true)
  const infos: DicomSliceInfo[] = []
  for (let start = 0; start < paths.length; start += CONCURRENCY) {
    const batch = await Promise.all(paths.slice(start, start + CONCURRENCY).map(sliceInfo))
    for (const info of batch) if (info) infos.push(info)
  }
  return groupSeries(infos)
}

/** The folder holding a series' first slice (an item's `path`). */
export const seriesFolder = (series: DicomSeries, fallback: string) =>
  series.slices[0]?.path.replace(/[\\/][^\\/]*$/, "") || fallback

/** Read a series back from an item's inline data. */
export function seriesOfItem(data: Record<string, unknown> | undefined): DicomSeries | null {
  const raw = data?.series
  if (typeof raw !== "string") return null
  try {
    return JSON.parse(raw) as DicomSeries
  } catch {
    return null
  }
}
