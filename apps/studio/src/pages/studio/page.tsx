"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { useProjectsStore } from "@/hooks/use-store"

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()

  const {
    getProjectById,
    getImagesById,
    setCurrentImage,
    setLabels,
    getLabelsByProjectId,
  } = useProjectsStore()
  useEffect(() => {
    const fetchProject = async () => {
      const images = await getImagesById(imageId ?? "")
      const labels = await getLabelsByProjectId(projectId ?? "")
      setCurrentImage(images)
      setLabels(labels)
    }

    fetchProject()
  }, [
    projectId,
    getProjectById,
    getImagesById,
    imageId,
    setCurrentImage,
    getLabelsByProjectId,
    setLabels,
  ])
  return (
    <>
      <ImageLabeler />
    </>
  )
}
