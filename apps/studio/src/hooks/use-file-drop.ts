import { useEffect, useRef, useState } from "react"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { isDesktopApp } from "@/lib/desktop"

// Subscribe to the webview's native file drag-and-drop (Tauri v2). HTML5 drop is
// suppressed when dragDrop is enabled (the default), and only the native event
// carries absolute paths — which is what the "reference in place" model needs.
// Returns whether files are currently hovering the window. No-ops off desktop.
export function useFileDrop(
  onDrop: (paths: string[]) => void,
  enabled = true
): boolean {
  const [isOver, setIsOver] = useState(false)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })

  useEffect(() => {
    if (!enabled || !isDesktopApp()) return
    let disposed = false
    let unlisten: (() => void) | undefined

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const payload = event.payload
        if (payload.type === "enter" || payload.type === "over") {
          setIsOver(true)
        } else if (payload.type === "leave") {
          setIsOver(false)
        } else if (payload.type === "drop") {
          setIsOver(false)
          if (payload.paths.length > 0) onDropRef.current(payload.paths)
        }
      })
      .then((un) => {
        if (disposed) un()
        else unlisten = un
      })
      .catch(() => {})

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [enabled])

  return isOver
}
