"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { useCanvasStore } from "@/hooks/canvas-store"
import { useImageDataStore } from "@/hooks/use-image-data-store"
import { useLabelStore } from "@/hooks/use-label-store"
import { useEffect } from "react"
import { useParams } from "react-router-dom"

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()
  const { getLabelsByProjectId, setLabels } = useLabelStore()
  const { getImage } = useImageDataStore()
  const { setCurrentImage } = useCanvasStore()
  useEffect(() => {
    if (!projectId || !imageId) return
    const fetchProject = async () => {
      const image = await getImage(imageId)
      const labels = await getLabelsByProjectId(projectId)
      if (image) {
        setCurrentImage(image)
      }
      if (labels) {
        setLabels(labels)
      }
    }

    fetchProject()
  }, [
    projectId,
    imageId,
    getImage,
    getLabelsByProjectId,
    setCurrentImage,
    setLabels,
  ])
  return <ImageLabeler />
}
