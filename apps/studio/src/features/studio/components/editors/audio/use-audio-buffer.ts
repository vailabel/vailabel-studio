import { useEffect, useState } from "react"
import { allowImageDirectory, toAssetUrl } from "@/shared/lib/desktop"

function fileDir(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]*$/, "") || filePath
}

export interface AudioData {
  /** Per-pixel-bucket [min, max] amplitude peaks for waveform rendering. */
  peaks: Array<[number, number]>
  duration: number
}

interface LoadState {
  path?: string
  data: AudioData | null
  error: string | null
}

const PEAK_BUCKETS = 2000

// Downsample mono channel data into [min,max] peaks per bucket for a compact,
// resolution-independent waveform.
function computePeaks(channel: Float32Array, buckets: number): Array<[number, number]> {
  const size = Math.max(1, Math.floor(channel.length / buckets))
  const peaks: Array<[number, number]> = []
  for (let i = 0; i < buckets; i++) {
    const start = i * size
    if (start >= channel.length) break
    let min = 1
    let max = -1
    for (let j = start; j < start + size && j < channel.length; j++) {
      const value = channel[j]
      if (value < min) min = value
      if (value > max) max = value
    }
    peaks.push([min, max])
  }
  return peaks
}

// Decode an audio file (via the asset protocol + Web Audio API) into waveform
// peaks + duration. State is only set inside the async resolution; "loading" is
// derived by comparing the resolved path with the requested one.
export function useAudioBuffer(path?: string, id?: string) {
  const [state, setState] = useState<LoadState>({ data: null, error: null })

  useEffect(() => {
    if (!path) return
    let cancelled = false
    let context: AudioContext | null = null
    // Everything (including the unavailable-Web-Audio error) resolves through the
    // promise chain so state is only ever set in an async callback.
    Promise.resolve()
      .then(() => {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!AudioCtx) throw new Error("Web Audio is unavailable.")
        context = new AudioCtx()
        // Ensure asset-protocol access (re-granted projects lose runtime scope).
        return allowImageDirectory(fileDir(path)).catch(() => {})
      })
      .then(() => fetch(toAssetUrl(path)))
      .then((response) => response.arrayBuffer())
      .then((buffer) => context!.decodeAudioData(buffer))
      .then((audioBuffer) => {
        if (cancelled) return
        const channel = audioBuffer.getChannelData(0)
        setState({
          path,
          data: {
            peaks: computePeaks(channel, PEAK_BUCKETS),
            duration: audioBuffer.duration,
          },
          error: null,
        })
      })
      .catch((nextError) => {
        if (cancelled) return
        setState({
          path,
          data: null,
          error:
            nextError instanceof Error ? nextError.message : "Could not decode audio.",
        })
      })
      .finally(() => {
        if (context) void context.close()
      })
    return () => {
      cancelled = true
    }
  }, [path, id])

  const loading = state.path !== path
  return {
    data: loading ? null : state.data,
    error: loading ? null : state.error,
  }
}
