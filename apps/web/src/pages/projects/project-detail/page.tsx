import { db } from "@/lib/db"
import { Project } from "@/lib/types"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Link, useParams } from "react-router-dom"
import Loading from "@/components/loading"

import MainLayout from "@/pages/main-layout"

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>()

  const [project, setProject] = useState<Project | null>(null)
  const [showAnnotated] = useState(false)

  const annotatedImages =
    project?.images?.filter((image) => image.name.includes("annotated")) || []

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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{project.name}</CardTitle>
          <p className="text-gray-500">Project ID: {projectId}</p>
        </CardHeader>
        <CardContent>
          <section className="mb-6">
            <h2 className="text-xl font-semibold">Images</h2>

            {showAnnotated ? (
              annotatedImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {annotatedImages.map((image, index) => (
                    <Card key={index} className="overflow-hidden">
                      <Link to={`/projects/${projectId}/${image.id}`}>
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
                <p className="text-gray-600">No annotated images available.</p>
              )
            ) : (project?.images?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {project.images?.map((image, index) => (
                  <Card key={index} className="overflow-hidden">
                    <Link to={`/projects/${projectId}/studio/${image.id}`}>
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
    </MainLayout>
  )
}
