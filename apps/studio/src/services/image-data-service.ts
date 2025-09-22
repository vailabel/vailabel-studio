import type { ImageDataService } from "@/hooks/use-paginated-images"
import type { ImageData } from "@vailabel/core"

export function createWebImageDataService(
  getImagesByProjectId: (projectId: string) => Promise<ImageData[]>,
  deleteImage: (imageId: string) => Promise<void>,
  updateImage: (imageId: string, updates: Partial<ImageData>) => Promise<void>
): ImageDataService {
  return {
    async fetchImagesRange(projectId: string, offset: number, limit: number): Promise<ImageData[]> {
      // For web, we'll fetch all images and slice them
      // In a real implementation, you'd want to implement server-side pagination
      const allImages = await getImagesByProjectId(projectId)
      return allImages.slice(offset, offset + limit)
    },

    async fetchImagesCount(projectId: string): Promise<number> {
      const allImages = await getImagesByProjectId(projectId)
      return allImages.length
    },

    async deleteImage(imageId: string): Promise<void> {
      await deleteImage(imageId)
    },

    async updateImage(imageId: string, updates: Partial<ImageData>): Promise<void> {
      await updateImage(imageId, updates)
    },
  }
}

// Desktop service adapter (for Electron)
export function createDesktopImageDataService(): ImageDataService {
  return {
    async fetchImagesRange(projectId: string, offset: number, limit: number): Promise<ImageData[]> {
      // Use Electron IPC to fetch paginated images
      const { ipcRenderer } = window.require('electron')
      return await ipcRenderer.invoke('fetch:imageDataRange', {
        projectId,
        offset,
        limit,
      })
    },

    async fetchImagesCount(projectId: string): Promise<number> {
      // Use Electron IPC to fetch total count
      const { ipcRenderer } = window.require('electron')
      const allImages = await ipcRenderer.invoke('fetch:imageDataByProjectId', projectId)
      return allImages.length
    },

    async deleteImage(imageId: string): Promise<void> {
      const { ipcRenderer } = window.require('electron')
      await ipcRenderer.invoke('delete:imageData', imageId)
    },

    async updateImage(imageId: string, updates: Partial<ImageData>): Promise<void> {
      const { ipcRenderer } = window.require('electron')
      await ipcRenderer.invoke('update:imageData', imageId, updates)
    },
  }
}

// Auto-detect environment and return appropriate service
export function createImageDataService(
  getImagesByProjectId: (projectId: string) => Promise<ImageData[]>,
  deleteImage: (imageId: string) => Promise<void>,
  updateImage: (imageId: string, updates: Partial<ImageData>) => Promise<void>
): ImageDataService {
  // Check if we're running in Electron
  if (typeof window !== 'undefined' && window.require) {
    try {
      window.require('electron')
      return createDesktopImageDataService()
    } catch {
      // Not in Electron, use web service
    }
  }
  
  return createWebImageDataService(getImagesByProjectId, deleteImage, updateImage)
}
