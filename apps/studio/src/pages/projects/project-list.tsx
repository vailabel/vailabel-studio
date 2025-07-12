import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, FolderOpen, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useProjectStore } from "@/hooks/use-project-store"

export default function ProjectList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { getProjects, deleteProject, projects } = useProjectStore()
  const confirm = useConfirmDialog()

  useEffect(() => {
    const loadProjects = async () => {
      await getProjects()
    }
    loadProjects()
  }, [])

  const handleProjectDelete = async (projectId: string) => {
    const ok = await confirm({
      title: "Delete Project?",
      description:
        "This action cannot be undone. This will permanently delete the project and all its images.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!ok) return
    try {
      await deleteProject(projectId)
      toast({
        title: "Success",
        description: "Project deleted successfully",
      })
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-gray-500">Manage your projects and images here.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/projects/create")}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700"
            >
              <CardHeader className="bg-gray-50 dark:bg-gray-700">
                <CardTitle>{project.name}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Created on {project?.createdAt?.toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <ImageIcon className="h-4 w-4" />
                  <span>{project.images?.length || 0} images</span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Last modified:{" "}
                  {project?.createdAt?.toLocaleString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between p-4 bg-gray-50 dark:bg-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/projects/detail/${project.id}`)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open Project
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 dark:hover:bg-gray-600 hover:bg-red-50"
                  onClick={() => handleProjectDelete(project.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                No projects found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Create a new project to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/projects/create")}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
