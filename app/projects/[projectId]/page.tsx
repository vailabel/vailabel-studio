"use client"

import { db } from "@/lib/db"
import { Project } from "@/lib/types"
import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import Link from "next/link"
import Loading from "@/components/loading"

import MainLayout from "@/app/main-layout"
import { useStore } from "@/lib/store"

export default function ProjectDetails({
  params: paramsPromise,
}: {
  params: Promise<{ projectId: string }>
}) {
  const params = React.use(paramsPromise)
  const { projectId } = params

  const [project, setProject] = useState<Project | null>(null)
  const { projects, loadProject } = useStore()
  const [showAnnotated, setShowAnnotated] = useState(false)

  const annotatedImages =
    project?.images.filter((image) => image.annotations?.length > 0) || []

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      try {
        const projectData = await db.projects.get(projectId)
        console.log("Fetched project data:", projectData)
        if (projectData) {
          setProject(projectData)
        } else {
          console.error("Project not found")
        }
      } catch (error) {
        console.error("Failed to fetch project:", error)
      }
    }

    fetchProject()
  }, [projectId])

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold text-red-600">Project ID Missing</h1>
      </div>
    )
  }

  if (!project) {
    return <Loading />
  }

  return (
    <MainLayout>
      <main className="flex-1 p-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">{project.name}</CardTitle>
            <p className="text-gray-500">Project ID: {projectId}</p>
          </CardHeader>
          <CardContent>
            <section className="mb-6">
              <h2 className="text-xl font-semibold">Description</h2>
              <p className="text-gray-600">
                {project.name || "No description available."}
              </p>
            </section>
            <section className="mb-6">
              <h2 className="text-xl font-semibold">Images</h2>
              <div className="flex space-x-4 mb-4">
                <button
                  className={`px-4 py-2 rounded ${!showAnnotated ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                  onClick={() => setShowAnnotated(false)}
                >
                  All Images
                </button>
                <button
                  className={`px-4 py-2 rounded relative ${showAnnotated ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                  onClick={() => setShowAnnotated(true)}
                >
                  Annotated Images
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-2">
                    {annotatedImages.length}
                  </span>
                </button>
              </div>
              {showAnnotated ? (
                annotatedImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {annotatedImages.map((image, index) => (
                      <Card key={index} className="overflow-hidden">
                        <Link href={`/projects/${projectId}/${image.id}`}>
                          <img
                            src={image.data || "/placeholder.svg"}
                            alt={`Image ${index + 1}`}
                            className="w-full h-48 object-cover"
                          />
                          <CardContent className="p-2">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {image.name.length > 50
                                ? `${image.name.slice(0, 50)}...`
                                : image.name}
                            </p>
                          </CardContent>
                        </Link>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">
                    No annotated images available.
                  </p>
                )
              ) : project.images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {project.images.map((image, index) => (
                    <Card key={index} className="overflow-hidden">
                      <Link href={`/projects/${projectId}/${image.id}`}>
                        <img
                          src={image.data || "/placeholder.svg"}
                          alt={`Image ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <CardContent className="p-2">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {image.name.length > 50
                              ? `${image.name.slice(0, 50)}...`
                              : image.name}
                          </p>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No images available.</p>
              )}
            </section>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  )
}
