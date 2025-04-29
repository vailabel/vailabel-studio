"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Plus, Trash2, FolderOpen, ImageIcon, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectManager } from "@/components/project-manager"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/lib/settings-store"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/types"

interface ProjectDashboardProps {
  projects: Project[]
  isLoading: boolean
  onProjectSelect: (project: Project) => void
  onProjectCreate: (project: Project) => void
  onProjectDelete: (projectId: string) => void
}

export function ProjectDashboard({
  projects,
  isLoading,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
}: ProjectDashboardProps) {
  const { toast } = useToast()
  const [showNewProject, setShowNewProject] = useState(false)
  const { darkMode, setDarkMode } = useSettingsStore()

  const handleProjectCreate = (project: Project) => {
    onProjectCreate(project)
    setShowNewProject(false)

    toast({
      title: "Project created",
      description: `${project.name} has been created with ${project.images.length} images.`,
    })
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      onProjectDelete(projectId)
    }
  }

  return (
    <div className={cn("container mx-auto p-6", darkMode ? "text-gray-100" : "")}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Labeling Projects</h1>
          <p className={cn("text-gray-500", darkMode && "text-gray-400")}>
            Create, manage, and label your image projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className={cn("text-lg font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
              Loading projects...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <Card key={project.id} className={cn("overflow-hidden", darkMode && "bg-gray-800 border-gray-700")}>
                <CardHeader className={cn("bg-gray-50", darkMode && "bg-gray-700")}>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription className={darkMode ? "text-gray-400" : ""}>
                    Created on {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className={cn("flex items-center gap-2 text-sm", darkMode ? "text-gray-400" : "text-gray-500")}>
                    <ImageIcon className="h-4 w-4" />
                    <span>{project.images.length} images</span>
                  </div>
                  <p className={cn("mt-2 text-sm", darkMode ? "text-gray-400" : "text-gray-500")}>
                    Last modified: {new Date(project.lastModified).toLocaleString()}
                  </p>
                </CardContent>
                <CardFooter className={cn("flex justify-between p-4", darkMode ? "bg-gray-700" : "bg-gray-50")}>
                  <Button variant="outline" size="sm" onClick={() => onProjectSelect(project)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Project
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-red-500 hover:text-red-600",
                      darkMode ? "hover:bg-gray-600" : "hover:bg-red-50",
                    )}
                    onClick={() => handleDeleteProject(project.id, project.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div
              className={cn(
                "col-span-full flex h-64 items-center justify-center rounded-lg border-2 border-dashed",
                darkMode ? "border-gray-700" : "border-gray-300",
              )}
            >
              <div className="text-center">
                <p className={cn("text-lg font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
                  No projects found
                </p>
                <p className={cn("text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>
                  Create a new project to get started
                </p>
                <Button className="mt-4" onClick={() => setShowNewProject(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showNewProject && (
          <ProjectManager onClose={() => setShowNewProject(false)} onProjectCreate={handleProjectCreate} />
        )}
      </AnimatePresence>
    </div>
  )
}
