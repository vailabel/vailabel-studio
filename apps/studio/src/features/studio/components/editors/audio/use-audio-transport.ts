import { useCallback, useRef, useState } from "react"

/**
 * Owns the <audio> element transport: a ref to bind to the element, the current
 * playhead time, the play/pause flag, and seek / toggle helpers. Resets to the
 * start whenever the clip changes.
 */
export function useAudioTransport(docId: string | undefined) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Reset transport when switching clips — done during render (React's
  // "adjust state when a prop changes" pattern) rather than in an effect, so
  // there's no extra commit/flash before the reset takes hold.
  const [clipId, setClipId] = useState(docId)
  if (docId !== clipId) {
    setClipId(docId)
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  return {
    audioRef,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    seek,
    togglePlay,
  }
}
