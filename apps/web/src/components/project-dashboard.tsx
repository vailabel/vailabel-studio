"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
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
import { ProjectManager } from "@/components/project-manager"
import { useToast } from "@/hooks/use-toast"
import type { Project } from "@/lib/types"


interface ProjectDashboardProps {
  projects: Project[]
  isLoading: boolean
  onProjectCreate: (project: Project) => void
  onProjectDelete: (projectId: string) => void
}

export function ProjectDashboard({
  projects,
  isLoading,
  onProjectCreate,
  onProjectDelete,
}: ProjectDashboardProps) {
  const { toast } = useToast()
  const [showNewProject, setShowNewProject] = useState(false)

  const handleProjectCreate = (project: Project) => {
    onProjectCreate(project)
    setShowNewProject(false)

    toast({
      title: "Project created",
      description: `${project.name} has been created with ${project.images.length} images.`,
    })
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${projectName}"? This action cannot be undone.`
      )
    ) {
      onProjectDelete(projectId)
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
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <motion.div
            className="relative flex items-center justify-center h-12 w-12"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <div className="absolute h-12 w-12 border-2 border-blue-500 rounded-full"></div>
            <div className="absolute h-10 w-10 border-2 border-t-blue-500 border-transparent rounded-full"></div>
          </motion.div>
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Loading projects...
          </p>
        </div>
      ) : (
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
                    Created on{" "}
                    {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <ImageIcon className="h-4 w-4" />
                    <span>{project.images.length} images</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Last modified:{" "}
                    {new Date(project.lastModified).toLocaleString()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between p-4 bg-gray-50 dark:bg-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = `/projects/${project.id}`)
                    }
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Project
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 dark:hover:bg-gray-600 hover:bg-red-50"
                    onClick={() =>
                      handleDeleteProject(project.id, project.name)
                    }
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
                  onClick={() => setShowNewProject(true)}
                >
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
          <ProjectManager
            onClose={() => setShowNewProject(false)}
            onProjectCreate={handleProjectCreate}
          />
        )}
      </AnimatePresence>
    </>
  )
}
