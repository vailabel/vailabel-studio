import { useState, useCallback, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import type { ImageData } from "@vailabel/core"

export interface PaginatedImageData {
  images: ImageData[]
  totalCount: number
  isLoading: boolean
  error: string | null
  pageIndex: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedImageDataActions {
  // Pagination
  setPageIndex: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  nextPage: () => void
  previousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  
  // Data operations
  refresh: () => Promise<void>
  loadPage: (pageIndex: number, pageSize: number) => Promise<void>
  
  // Image operations
  deleteImage: (imageId: string) => Promise<void>
  updateImage: (imageId: string, updates: Partial<ImageData>) => Promise<void>
}

export interface UsePaginatedImagesOptions {
  projectId: string
  initialPageSize?: number
  autoLoad?: boolean
}

export interface ImageDataService {
  fetchImagesRange: (projectId: string, offset: number, limit: number) => Promise<ImageData[]>
  fetchImagesCount: (projectId: string) => Promise<number>
  deleteImage: (imageId: string) => Promise<void>
  updateImage: (imageId: string, updates: Partial<ImageData>) => Promise<void>
}

export function usePaginatedImages(
  service: ImageDataService,
  options: UsePaginatedImagesOptions
): PaginatedImageData & PaginatedImageDataActions {
  const { toast } = useToast()
  const {
    projectId,
    initialPageSize = 10,
    autoLoad = true,
  } = options

  // Use ref to stabilize service reference
  const serviceRef = useRef(service)
  serviceRef.current = service

  // State
  const [state, setState] = useState<PaginatedImageData>({
    images: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    pageIndex: 0,
    pageSize: initialPageSize,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  // Load page data - use ref to avoid circular dependencies
  const loadPageRef = useRef<(pageIndex: number, pageSize: number) => Promise<void>>(() => Promise.resolve())
  
  loadPageRef.current = async (pageIndex: number, pageSize: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const offset = pageIndex * pageSize
      const [images, totalCount] = await Promise.all([
        serviceRef.current.fetchImagesRange(projectId, offset, pageSize),
        serviceRef.current.fetchImagesCount(projectId),
      ])

      const totalPages = Math.ceil(totalCount / pageSize)
      const hasNextPage = pageIndex < totalPages - 1
      const hasPreviousPage = pageIndex > 0

      setState(prev => ({
        ...prev,
        images,
        totalCount,
        pageIndex,
        pageSize,
        hasNextPage,
        hasPreviousPage,
        isLoading: false,
      }))
    } catch (error) {
      console.error("Failed to load images:", error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to load images",
      }))
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive",
      })
    }
  }

  // Stable loadPage function
  const loadPage = useCallback((pageIndex: number, pageSize: number) => {
    return loadPageRef.current?.(pageIndex, pageSize) || Promise.resolve()
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && projectId) {
      loadPage(0, initialPageSize)
    }
  }, [autoLoad, projectId, initialPageSize, loadPage])

  // Pagination actions
  const setPageIndex = useCallback((pageIndex: number) => {
    loadPage(pageIndex, state.pageSize)
  }, [loadPage, state.pageSize])

  const setPageSize = useCallback((pageSize: number) => {
    loadPage(0, pageSize) // Reset to first page when changing page size
  }, [loadPage])

  const nextPage = useCallback(() => {
    if (state.hasNextPage) {
      setPageIndex(state.pageIndex + 1)
    }
  }, [state.hasNextPage, state.pageIndex, setPageIndex])

  const previousPage = useCallback(() => {
    if (state.hasPreviousPage) {
      setPageIndex(state.pageIndex - 1)
    }
  }, [state.hasPreviousPage, state.pageIndex, setPageIndex])

  const goToFirstPage = useCallback(() => {
    setPageIndex(0)
  }, [setPageIndex])

  const goToLastPage = useCallback(() => {
    const totalPages = Math.ceil(state.totalCount / state.pageSize)
    setPageIndex(totalPages - 1)
  }, [state.totalCount, state.pageSize, setPageIndex])

  // Data operations
  const refresh = useCallback(async () => {
    await loadPage(state.pageIndex, state.pageSize)
    toast({
      title: "Refreshed",
      description: "Images list has been updated",
    })
  }, [loadPage, state.pageIndex, state.pageSize, toast])

  // Image operations
  const deleteImage = useCallback(async (imageId: string) => {
    try {
      await serviceRef.current.deleteImage(imageId)
      
      // Update local state
      setState(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageId),
        totalCount: prev.totalCount - 1,
      }))

      toast({
        title: "Image deleted",
        description: "Image has been removed successfully",
      })
    } catch (error) {
      console.error("Failed to delete image:", error)
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    }
  }, [toast])

  const updateImage = useCallback(async (imageId: string, updates: Partial<ImageData>) => {
    try {
      await serviceRef.current.updateImage(imageId, updates)
      
      // Update local state
      setState(prev => ({
        ...prev,
        images: prev.images.map(img => 
          img.id === imageId ? { ...img, ...updates } : img
        ),
      }))

      toast({
        title: "Image updated",
        description: "Image has been updated successfully",
      })
    } catch (error) {
      console.error("Failed to update image:", error)
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive",
      })
    }
  }, [toast])

  return {
    ...state,
    setPageIndex,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    refresh,
    loadPage,
    deleteImage,
    updateImage,
  }
}
