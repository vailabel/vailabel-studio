"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { Project } from "@/lib/types"
import { useEffect, useState } from "react"
import Loading from "@/components/loading"
import { useStore } from "@/lib/store"
import { useParams } from "react-router-dom"

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()

  const { loadProject, currentProject } = useStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    loadProject(projectId || "")
    setIsLoading(false)
  }, [projectId])

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && (currentProject as Project) && (
        <ImageLabeler
          project={currentProject as Project}
          imageId={imageId || ""}
          onClose={() => (window.location.href = `/projects/${projectId}`)}
        />
      )}
    </>
  )
}
