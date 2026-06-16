import { memo, useMemo } from "react"
import { LabelingScreen } from "@/components/studio/labeling-screen"
import { CanvasProvider } from "@/contexts/canvas-context"
import { useParams } from "react-router-dom"

// Memoized wrapper to prevent unnecessary re-renders
const MemoizedLabelingScreen = memo(LabelingScreen)

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()

  // Memoize the props to prevent unnecessary re-renders of the labeling screen
  const labelerProps = useMemo(
    () => ({
      projectId,
      imageId,
    }),
    [projectId, imageId]
  )

  return (
    <CanvasProvider>
      <MemoizedLabelingScreen {...labelerProps} />
    </CanvasProvider>
  )
}
