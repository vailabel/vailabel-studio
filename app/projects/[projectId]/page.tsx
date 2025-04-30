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

export default function ProjectDetails({
  params: paramsPromise,
}: {
  params: Promise<{ projectId: string }>
}) {
  const params = React.use(paramsPromise)
  const { projectId } = params

  const [project, setProject] = useState<
    (Project & { images: any[]; totalImages: number }) | null
  >(null)
  const [currentPage, setCurrentPage] = useState(1)
  const imagesPerPage = 50

  const loadProject = async (
    projectId: string,
    page: number,
    limit: number
  ) => {
    const offset = (page - 1) * limit
    const images = await db.images
      .filter((image) => image.projectId === projectId)
      .offset(offset)
      .limit(limit)
      .toArray()

    const totalImages = await db.images
      .filter((image) => image.projectId === projectId)
      .count()

    const project = await db.projects.filter((p) => p.id === projectId).first()

    return { ...project, images, totalImages }
  }

  useEffect(() => {
    loadProject(projectId, currentPage, imagesPerPage)
      .then((data) => setProject(data))
      .catch((error) => console.error("Error loading project:", error))
  }, [projectId, currentPage])

  const totalPages = project?.totalImages
    ? Math.ceil(project.totalImages / imagesPerPage)
    : 0

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1)
  }

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
                  <Pagination>
                    <PaginationPrevious onClick={handlePreviousPage}>
                      Previous
                    </PaginationPrevious>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink>{currentPage}</PaginationLink>
                      </PaginationItem>
                      <PaginationEllipsis />
                      <PaginationItem>
                        <PaginationLink>{totalPages}</PaginationLink>
                      </PaginationItem>
                    </PaginationContent>
                    <PaginationNext onClick={handleNextPage}>
                      Next
                    </PaginationNext>
                  </Pagination>
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
