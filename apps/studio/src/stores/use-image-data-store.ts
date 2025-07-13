import { ImageData } from "@vailabel/core"
import { create } from "zustand"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { exceptionMiddleware } from "@/hooks/exception-middleware"
import { IStorageAdapter } from "@/adapters/storage"

type ImageDataStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void
  storage: IStorageAdapter
  initStorageAdapter: (storageAdapter: IStorageAdapter) => void
  images: ImageData[]
  image: ImageData | undefined
  getImages: () => Promise<ImageData[]>
  getImageImageById: (id: string) => Promise<ImageData | undefined>
  getImageWithAnnotations: (imageId: string) => Promise<ImageData>
  getImagesByProjectId: (projectId: string) => Promise<ImageData[]>
  createImage: (image: ImageData) => Promise<void>
  updateImage: (id: string, updates: Partial<ImageData>) => Promise<void>
  deleteImage: (id: string) => Promise<void>
}

export const useImageDataStore = create<ImageDataStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),

    storage: {} as IStorageAdapter,
    initStorageAdapter: (storageAdapter) => set({ storage: storageAdapter }),

    images: [],
    image: undefined,

    getImages: async () => {
      const { data } = get()
      const images = await data.fetchImageData("defaultProjectId") // Replace with actual project ID
      set({ images })
      return images
    },

    getImageImageById: async (id) => {
      const { data } = get()
      const image = await data.fetchImageDataById(id)
      set({ image })
      return image
    },

    getImageWithAnnotations: async (imageId) => {
      const { data } = get()
      const image = await data
        .fetchImageData("defaultProjectId")
        .then((images) => images.find((img) => img.id === imageId))
      if (!image) throw new Error(`Image with ID ${imageId} not found`)
      return image
    },

    getImagesByProjectId: async (projectId) => {
      const { data } = get()
      return await data.fetchImageDataByProjectId(projectId).then((images) => {
        set({ images })
        return images
      })
    },

    createImage: async (image) => {
      const { data, storage } = get()
      try {
        await storage.saveImage(image.id, image.data)
        await data.saveImageData(image)
      } catch (error) {
        await storage.deleteImage(image.id)
        throw error
      }
      set((state) => ({
        images: [...state.images, image],
        image,
      }))
    },

    updateImage: async (id, updates) => {
      const { data } = get()
      await data.updateImageData(id, updates)
      await get().getImages()
    },

    deleteImage: async (id) => {
      const { data } = get()
      await data.deleteImageData(id)
      set((state) => ({
        images: state.images.filter((img) => img.id !== id),
        image: state.image?.id === id ? undefined : state.image,
      }))
    },
  }))
)
