import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Loading from "@/components/loading"
import ImageWithLoader from "@/components/image-loader"
import { useProjectStore } from "@/hooks/use-project-store"
import { useImageDataStore } from "@/hooks/use-image-data-store"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useLabelStore } from "@/hooks/use-label-store"

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>()
  const { getProject, currentProject } = useProjectStore()
  const { getImagesByProjectId, images } = useImageDataStore()
  const { labels } = useLabelStore()
  const navigate = useNavigate()
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      await getProject(projectId)
      await getImagesByProjectId(projectId)
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

  if (!currentProject) {
    return <Loading />
  }

  return (
    <>
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold mb-1">{currentProject.name}</h1>
        <p className="text-gray-500 text-sm">Project ID: {projectId}</p>
      </div>
      <Tabs defaultValue="images" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="labels">Labels & Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="images">
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Images</h2>
            {images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
                  >
                    <button
                      className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      onClick={() =>
                        navigate(`/projects/${projectId}/studio/${image.id}`)
                      }
                    >
                      <ImageWithLoader
                        imageId={image.id ?? "/placeholder.svg"}
                        alt={`Image ${index + 1}`}
                      />
                      <div className="p-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {typeof image.name === "string" &&
                          image.name.length > 50
                            ? `${image.name.slice(0, 50)}...`
                            : image.name}
                        </p>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No images available.</p>
            )}
          </section>
        </TabsContent>
        <TabsContent value="labels">
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Labels & Settings</h2>
            {/* Placeholder for label and settings content */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Labels</h3>
              {labels.length > 0 ? (
                <ul className="list-disc pl-5">
                  {labels.map((label, index) => (
                    <li
                      key={index}
                      className="text-gray-600 dark:text-gray-300"
                    >
                      {label.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No labels available.</p>
              )}
              <h3 className="text-lg font-semibold mt-6 mb-4">Settings</h3>
              {/* Placeholder for settings content */}
              <p className="text-gray-600">No settings available.</p>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </>
  )
}
