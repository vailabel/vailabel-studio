"use client"

import { db } from "@/lib/db"
import { Project } from "@/lib/types"
import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import Link from "next/link"
import Loading from "@/components/loading"
import { Home, Package, Settings, Users, BarChart, Truck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      try {
        const projectData = await db.projects.get(projectId)
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
              {project.images.length > 0 ? (
                <>
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
                </>
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
