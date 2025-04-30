"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { db } from "@/lib/db"
import { Project } from "@/lib/types"
import { useEffect, useState } from "react"
import Loading from "@/components/loading"

export default function ImageStudio({
  params: paramsPromise,
}: {
  params: Promise<{ projectId: string; imageId: string }>
}) {
  const [params, setParams] = useState<{
    projectId: string
    imageId: string
  } | null>(null)

  useEffect(() => {
    paramsPromise.then(setParams).catch((error) => {
      console.error("Error unwrapping params:", error)
    })
  }, [paramsPromise])

  const fetchProject = async (projectId: string) => {
    const project = await db.projects.filter((p) => p.id === projectId).first()
    if (!project) {
      throw new Error("Project not found")
    }
    return project
  }

  const [activeProject, setActiveProject] = useState<Project>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!params) return

    setIsLoading(true)
    fetchProject(params.projectId)
      .then((data) => {
        setActiveProject(data)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Error loading project:", error)
        setIsLoading(false)
      })
  }, [params])

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && activeProject && (
        <ImageLabeler
          project={activeProject}
          imageId={params?.imageId}
          onClose={() =>
            (window.location.href = `/projects/${params?.projectId}`)
          }
        />
      )}
    </>
  )
}
