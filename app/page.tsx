"use client"

import { useState, useEffect } from "react"
import { ProjectDashboard } from "@/components/project-dashboard"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import type { Project } from "@/lib/types"

export default function ImageLabelingApp() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])

  // Load projects and active project on initial render
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await db.projects.toArray()
        setProjects(allProjects)
      } catch (error) {
        console.error("Failed to load projects or active project:", error)
        toast({
          title: "Error",
          description:
            "Failed to load projects or active project from local storage",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [toast])

  const handleProjectCreate = (project: Project) => {
    setProjects([...projects, project])
  }

  const handleProjectDelete = async (projectId: string) => {
    try {
      // Delete project from database
      await db.transaction(
        "rw",
        db.projects,
        db.images,
        db.labels,
        async () => {
          // Delete all labels associated with the project's images
          const projectImages = await db.images
            .where("projectId")
            .equals(projectId)
            .toArray()
          const imageIds = projectImages.map((img) => img.id)

          await db.labels.where("imageId").anyOf(imageIds).delete()
          await db.images.where("projectId").equals(projectId).delete()
          await db.projects.delete(projectId)
        }
      )
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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <ProjectDashboard
        projects={projects}
        isLoading={isLoading}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={handleProjectDelete}
      />
    </div>
  )
}
