import { memo, useMemo } from "react"
import { LabelingScreen } from "@/features/studio/components/labeling-screen"
import { CanvasProvider } from "@/features/studio/canvas-state/canvas-context"
import { RegionVisibilityProvider } from "@/features/studio/canvas-state/use-region-visibility"
import { useParams } from "react-router-dom"

// Memoized wrapper to prevent unnecessary re-renders
const MemoizedLabelingScreen = memo(LabelingScreen)

export default function ImageStudio() {
  const { projectId, itemId } = useParams<{
    projectId: string
    itemId: string
  }>()

  // Memoize the props to prevent unnecessary re-renders of the labeling screen
  const labelerProps = useMemo(
    () => ({
      projectId,
      itemId,
    }),
    [projectId, itemId]
  )

  return (
    <CanvasProvider>
      {/* Per-image region visibility lives in its own scoped provider; keying it
          by image resets the hidden set when the user navigates to another item. */}
      <RegionVisibilityProvider key={itemId}>
        <MemoizedLabelingScreen {...labelerProps} />
      </RegionVisibilityProvider>
    </CanvasProvider>
  )
}
