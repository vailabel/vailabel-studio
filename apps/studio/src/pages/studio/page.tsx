import { ImageLabeler } from "@/components/image-labeler"
import { useParams } from "react-router-dom"

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()

  return <ImageLabeler projectId={projectId} imageId={imageId} />
}
