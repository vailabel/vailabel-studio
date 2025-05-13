"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { Project } from "@/lib/types"
import { useEffect, useState } from "react"
import Loading from "@/components/loading"
import { useStore } from "@/lib/store"
import { useParams } from "react-router-dom"
import { AnnotationsProvider } from "@/contexts/annotations-context-provider"
import { CanvasProvider } from "@/contexts/canvas-context-provider"

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
  }, [loadProject, projectId])
  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && (currentProject as Project) && (
        <CanvasProvider>
          <AnnotationsProvider>
            <ImageLabeler
              project={currentProject as Project}
              imageId={imageId ?? ""}
              onClose={() => (window.location.href = `/projects/${projectId}`)}
            />
          </AnnotationsProvider>
        </CanvasProvider>
      )}
    </>
  )
}
