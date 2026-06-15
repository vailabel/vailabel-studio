import { useEffect } from "react"
import type { Label } from "@/types/core"

interface UseLabelHotkeysOptions {
  labels: Label[]
  activeLabelId: string | null
  setActiveLabelId: (id: string | null) => void
  onNextImage: () => void
  onPreviousImage: () => void
  /** View toggles — H = crosshair, X = coordinates, R = ruler. */
  onToggleCrosshair?: () => void
  onToggleCoordinates?: () => void
  onToggleRuler?: () => void
  /** Disable while another surface (e.g. a modal) owns the keyboard. */
  enabled?: boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  )
}

/**
 * Single keyboard listener for the labeler shell: image navigation (←/→) and
 * class selection (1–9 arms the Nth class; 0 / Esc clears it). Consolidates the
 * previously separate arrow-key and class-selection handlers into one place so
 * the bindings can't drift. Tool shortcuts continue to live in the canvas
 * handler context. Mirrors the "skip while typing" guard the old handlers used.
 */
export function useLabelHotkeys({
  labels,
  activeLabelId,
  setActiveLabelId,
  onNextImage,
  onPreviousImage,
  onToggleCrosshair,
  onToggleCoordinates,
  onToggleRuler,
  enabled = true,
}: UseLabelHotkeysOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      // Leave modified chords (undo/redo, browser shortcuts) untouched.
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === "ArrowRight") {
        onNextImage()
        return
      }
      if (event.key === "ArrowLeft") {
        onPreviousImage()
        return
      }
      if (event.key === "Escape") {
        if (activeLabelId) setActiveLabelId(null)
        return
      }

      // View toggles (single, non-conflicting letters — tools use other keys).
      const lower = event.key.toLowerCase()
      if (lower === "h" && onToggleCrosshair) {
        onToggleCrosshair()
        return
      }
      if (lower === "x" && onToggleCoordinates) {
        onToggleCoordinates()
        return
      }
      if (lower === "r" && onToggleRuler) {
        onToggleRuler()
        return
      }

      // 1–9 arm the Nth class (in palette order); 0 clears the active class.
      if (event.key >= "1" && event.key <= "9") {
        const label = labels[Number(event.key) - 1]
        if (label) {
          event.preventDefault()
          setActiveLabelId(label.id)
        }
        return
      }
      if (event.key === "0") {
        setActiveLabelId(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    labels,
    activeLabelId,
    setActiveLabelId,
    onNextImage,
    onPreviousImage,
    onToggleCrosshair,
    onToggleCoordinates,
    onToggleRuler,
    enabled,
  ])
}
