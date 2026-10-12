import { useEffect, useEffectEvent, useState } from "react"
import { onFileDragDrop } from "@/shared/lib/desktop"

// Tracks native file drag-and-drop over the window and reports dropped paths
// (absolute — which is what the "reference in place" model needs). Returns
// whether files are currently hovering the window. No-ops off desktop.
export function useFileDrop(
  onDrop: (paths: string[]) => void,
  enabled = true
): boolean {
  const [isOver, setIsOver] = useState(false)
  const handleDrop = useEffectEvent(onDrop)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let unlisten: (() => void) | undefined

    void onFileDragDrop((event) => {
      if (disposed) return
      setIsOver(event.type === "enter" || event.type === "over")
      if (event.type === "drop" && event.paths.length > 0) {
        handleDrop(event.paths)
      }
    }).then((release) => {
      if (disposed) release()
      else unlisten = release
    })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [enabled])

  return isOver
}
