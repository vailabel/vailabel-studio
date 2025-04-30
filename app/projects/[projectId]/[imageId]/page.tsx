"use client"
import { ImageLabeler } from "@/components/image-labeler"
import { db } from "@/lib/db"
import { Project } from "@/lib/types"
import { useEffect, useState } from "react"
import Loading from "@/components/loading"
import { useStore } from "@/lib/store"

export default function ImageStudio({
  params: paramsPromise,
}: {
  params: Promise<{ projectId: string; imageId: string }>
}) {
  const [params, setParams] = useState<{
    projectId: string
    imageId: string
  } | null>(null)

  const { loadProject, currentProject } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    paramsPromise.then((params) => {
      setParams(params)
    })
  }, [])

  useEffect(() => {
    if (!params) return
    setIsLoading(true)
    loadProject(params.projectId)
    setIsLoading(false)
  }, [params?.projectId])

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && (currentProject as Project) && (
        <ImageLabeler
          project={currentProject as Project}
          imageId={params?.imageId || ""}
          onClose={() =>
            (window.location.href = `/projects/${params?.projectId}`)
          }
        />
      )}
    </>
  )
}
