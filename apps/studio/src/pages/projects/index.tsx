"use client"

import { useState, useEffect } from "react"
import { ProjectDashboard } from "@/components/project-dashboard"
import { useToast } from "@/hooks/use-toast"
import MainLayout from "../main-layout"
import { useDataAccess } from "@/hooks/use-data-access"
import { Project } from "@vailabel/core"

export default function ImageLabelingApp() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const { getProjects, deleteProject } = useDataAccess()
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects()
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
    <MainLayout>
      <ProjectDashboard
        projects={projects}
        isLoading={isLoading}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={handleProjectDelete}
      />
    </MainLayout>
  )
}
