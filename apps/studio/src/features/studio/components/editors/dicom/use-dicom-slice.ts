import { useEffect, useState } from "react"
import { toAssetUrl } from "@/shared/lib/desktop"
import { toErrorMessage } from "@/shared/lib/errors"
import { decodeSlice, type DicomPixels, type DicomSliceRef } from "@/shared/lib/dicom/dicom"

/** Decoded slices kept around for fast scrolling (≈ 1 MB each at 512²). */
const CACHE_SIZE = 32
const cache = new Map<string, Promise<DicomPixels>>()

const keyOf = (slice: DicomSliceRef) => `${slice.path}#${slice.frame}`

function load(slice: DicomSliceRef): Promise<DicomPixels> {
  const key = keyOf(slice)
  const hit = cache.get(key)
  if (hit) {
    // Refresh recency.
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }
  const pending = fetch(toAssetUrl(slice.path))
    .then((response) => {
      if (!response.ok) throw new Error("This DICOM file could not be read.")
      return response.arrayBuffer()
    })
    .then((buffer) => decodeSlice(new Uint8Array(buffer), slice.frame))
  pending.catch(() => cache.delete(key))
  cache.set(key, pending)
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!)
  return pending
}

interface SliceState {
  key?: string
  pixels: DicomPixels | null
  error: string | null
}

/** Decode the current slice (cached), prefetching its neighbours. */
export function useDicomSlice(slices: DicomSliceRef[], index: number) {
  const slice = slices[index]
  const key = slice ? keyOf(slice) : undefined
  const [state, setState] = useState<SliceState>({ pixels: null, error: null })

  useEffect(() => {
    if (!slice || !key) return
    let cancelled = false
    load(slice).then(
      (pixels) => !cancelled && setState({ key, pixels, error: null }),
      (error) => !cancelled && setState({ key, pixels: null, error: toErrorMessage(error) })
    )
    for (const near of [index + 1, index - 1, index + 2]) {
      if (slices[near]) void load(slices[near]).catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [slice, key, index, slices])

  const current = state.key === key
  return { pixels: current ? state.pixels : null, error: current ? state.error : null }
}
