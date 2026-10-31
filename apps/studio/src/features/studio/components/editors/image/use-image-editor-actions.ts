import { useCallback, useRef } from "react"
import { toast } from "sonner"
import { toErrorMessage } from "@/shared/lib/errors"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

/**
 * Owns the image editor's canvas container ref (used to size the right-click
 * context menu), the context-menu open handler, and the toolbar's one-click AI
 * auto-label (which phrases its own result toast). Smart Segment surfaces its
 * own feedback in the view model and is wired straight to the canvas.
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

  const { generatePredictions } = viewModel
  const autoLabel = useCallback(
    async (modelId: string, threshold: number) => {
      const pending = toast.loading("AI is looking for objects…", {
        description: "The model downloads on first use, so the first run can take a moment.",
      })
      try {
        const predictions = await generatePredictions(modelId, threshold)
        toast.dismiss(pending)
        if (predictions.length === 0) {
          toast.info("AI didn't find anything at this confidence.", {
            description: "Try lowering the minimum confidence, or draw the shapes yourself.",
          })
          return
        }
        toast.success(
          `AI suggested ${predictions.length} shape${predictions.length === 1 ? "" : "s"}.`,
          { description: "Check each one with ✓ / ✗, or use Accept all above the image." }
        )
      } catch (error) {
        toast.dismiss(pending)
        toast.error("Auto-label failed", {
          description: toErrorMessage(error, "The AI model couldn't run on this image."),
        })
      }
    },
    [generatePredictions]
  )

  return {
    canvasContainerRef,
    handleContextMenu,
    autoLabel,
  }
}
