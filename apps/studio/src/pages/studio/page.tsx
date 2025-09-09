import { memo, useMemo } from "react"
import { ImageLabeler } from "@/components/image-labeler"
import { useParams } from "react-router-dom"

// Memoized wrapper to prevent unnecessary re-renders
const MemoizedImageLabeler = memo(ImageLabeler)

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()

  // Memoize the props to prevent unnecessary re-renders of ImageLabeler
  const labelerProps = useMemo(
    () => ({
      projectId,
      imageId,
    }),
    [projectId, imageId]
  )

  return <MemoizedImageLabeler {...labelerProps} />
}
