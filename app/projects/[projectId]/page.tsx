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

  const paginateImages = (images: any[]) => {
    const startIndex = (currentPage - 1) * imagesPerPage
    const endIndex = startIndex + imagesPerPage
    return images.slice(startIndex, endIndex)
  }

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

    if (!images.length && totalImages === 0) {
      throw new Error("Project not found or no images available")
    }

    const project = await db.projects.filter((p) => p.id === projectId).first()

    if (!project) {
      throw new Error("Project not found")
    }

    return { ...project, images, totalImages }
  }

  useEffect(() => {
    loadProject(projectId, currentPage, imagesPerPage)
      .then((data) => {
        setProject(data)
      })
      .catch((error) => {
        console.error("Error loading project:", error)
      })
  }, [projectId, currentPage])

  const totalPages = project?.totalImages
    ? Math.ceil(project.totalImages / imagesPerPage)
    : 0

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1)
    }
  }

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold text-red-600">Project Details</h1>
        <p className="text-lg text-gray-700">Error: Project ID is missing.</p>
      </div>
    )
  }

  if (!project) {
    return <Loading />
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Project Details</CardTitle>
          <p className="text-gray-500">Project ID: {projectId}</p>
        </CardHeader>
        <CardContent>
          <section className="mb-6">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="text-gray-600">
              {project.name || "No description available for this project."}
            </p>
          </section>
          <section className="mb-6">
            <h2 className="text-xl font-semibold">Images</h2>
            {project.images && project.images.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {project.images.map((image, index) => (
                    <Card key={index} className="overflow-hidden">
                      <Link href={`/projects/${projectId}/${image.id}`}>
                        <img
                          src={image.data || "/placeholder.svg"}
                          alt={`Image ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            {image.name.length > 20
                              ? `${image.name.slice(0, 20)}...`
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
                  <PaginationNext onClick={handleNextPage}>Next</PaginationNext>
                </Pagination>
              </>
            ) : (
              <p className="text-gray-600">
                No images available for this project.
              </p>
            )}
          </section>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-end">
        <Button variant="default" onClick={() => window.history.back()}>
          Back to Projects
        </Button>
      </div>
    </div>
  )
}
