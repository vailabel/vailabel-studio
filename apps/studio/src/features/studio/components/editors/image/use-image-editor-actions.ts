import { useCallback, useRef } from "react"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

/**
 * Owns the image editor's canvas container ref (used to size the right-click
 * context menu) and the context-menu open handler. Auto-label, prediction
 * review, and the Copilot now live in the studio right panel; Smart Segment
 * surfaces its own feedback in the view model and is wired straight to the canvas.
 */
export function useImageEditorActions(viewModel: StudioScreenViewModel) {
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect()
        viewModel.setContainer({ width: rect.width, height: rect.height })
      }
      viewModel.openContextMenu({ x: event.clientX, y: event.clientY })
      return false
    },
    [viewModel]
  )

  return {
    canvasContainerRef,
    handleContextMenu,
  }
}
