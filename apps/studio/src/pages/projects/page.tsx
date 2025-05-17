import { Project } from "@vailabel/core"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useParams } from "react-router-dom"
import Loading from "@/components/loading"
import MainLayout from "@/pages/main-layout"
import { useDataAccess } from "@/hooks/use-data-access"
import { useToast } from "@/hooks/use-toast"

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const { getProjectWithImages } = useDataAccess()
  const images = Array.isArray(project?.images) ? project.images : []

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      try {
        const projectData = await getProjectWithImages(projectId)
        if (projectData) {
          setProject(projectData)
        } else {
          toast({
            title: "Project not found",
            description: `No project found with ID: ${projectId}`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching project:", error)
        toast({
          title: "Error fetching project",
          description: "An error occurred while fetching the project.",
          variant: "destructive",
        })
      }
    }

    fetchProject()
  }, [projectId, getProjectWithImages, toast])

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

            {images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <Card key={index} className="overflow-hidden">
                    <Link to={`/projects/${projectId}/studio/${image.id}`}>
                      <img
                        src={image.data ?? "/placeholder.svg"}
                        alt={`Image ${index + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <CardContent className="p-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {typeof image.name === "string" &&
                          image.name.length > 50
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
