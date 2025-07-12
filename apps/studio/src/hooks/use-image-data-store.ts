import { ImageData } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"

type ImageDataStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void
  images: ImageData[]
  image: ImageData | undefined
  getImages: () => Promise<ImageData[]>
  getImage: (id: string) => Promise<ImageData | undefined>
  getImageWithAnnotations: (imageId: string) => Promise<ImageData>
  getImagesByProjectId: (projectId: string) => Promise<ImageData[]>
  setImages: (images: ImageData[]) => void
  createImage: (image: ImageData) => Promise<void>
  updateImage: (id: string, updates: Partial<ImageData>) => Promise<void>
  deleteImage: (id: string) => Promise<void>
  getOrCreateImage: (
    name: string,
    data: string,
    width: number,
    height: number,
    projectId: string
  ) => Promise<ImageData>
}

export const useImageDataStore = create<ImageDataStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),
    
    images: [],
    image: undefined,
    
    getImages: async () => {
      const { data } = get()
      const images = await data.fetchImageData('defaultProjectId') // Replace with actual project ID
      set({ images })
      return images
    },
    
    getImage: async (id) => {
      const { data } = get()
      const image = await data.fetchImageData('defaultProjectId').then(images =>
        images.find(img => img.id === id)
      )
      set({ image })
      return image
    },
    
    getImageWithAnnotations: async (imageId) => {
      const { data } = get()
      const image = await data.fetchImageData('defaultProjectId').then(images =>
        images.find(img => img.id === imageId)
      )
      if (!image) throw new Error(`Image with ID ${imageId} not found`)
      return image
    },
    
    getImagesByProjectId: async (projectId) => {
      const { data } = get()
      return await data.fetchImageDataByProjectId(projectId).then(images => {
        console.log(`Fetched ${images.length} images for project ${projectId}`)
        console.log(images)
        set({ images })
        return images
      })
    },
    
    setImages: (images) => set({ images }),
    
    createImage: async (image) => {
      const { data } = get()
      await data.saveImageData(image)
      set((state) => ({
        images: [...state.images, image],
        image,
      }))
    },
    
    updateImage: async (id, updates) => {
      const { data } = get()
      await data.updateImageData(id, updates)
      set((state) => ({
        images: state.images.map((img) =>
          img.id === id ? { ...img, ...updates } : img
        ),
        image: state.image?.id === id ? { ...state.image, ...updates } : state.image,
      }))
    },
    
    deleteImage: async (id) => {
      const { data } = get()
      await data.deleteImageData(id)
      set((state) => ({
        images: state.images.filter((img) => img.id !== id),
        image: state.image?.id === id ? undefined : state.image,
      }))
    },
    
    getOrCreateImage: async (name, data, width, height, projectId) => {
      const { data: adapterData, images } = get()
      let image = images.find(img => img.name === name && img.projectId === projectId)
      if (!image) {
        image = {
          id: crypto.randomUUID(),
          name,
          data,
          width,
          height,
          projectId,
          project: undefined as any,
          annotations: [],
        }
        await adapterData.saveImageData(image)
      }
      return image
    }
  }))
)
