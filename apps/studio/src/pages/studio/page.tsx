"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { Project } from "@vailabel/core"
import { useEffect, useState } from "react"
import Loading from "@/components/loading"
import { useParams } from "react-router-dom"
import { AnnotationsProvider } from "@/contexts/annotations-context-provider"
import { CanvasProvider } from "@/contexts/canvas-context-provider"
import { useDataAccess } from "@/hooks/use-data-access"

export default function ImageStudio() {
  const { projectId, imageId } = useParams<{
    projectId: string
    imageId: string
  }>()

  const { getProjectById } = useDataAccess()
  const [isLoading, setIsLoading] = useState(true)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true)
      try {
        const project = await getProjectById(projectId ?? "")
        setCurrentProject(project ?? null)
      } catch (error) {
        console.error("Error loading project:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [projectId, getProjectById])
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
