import { IDBContext, ImageData } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

type ImageDataStoreType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
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
    dbContext: {} as IDBContext,
    image: undefined,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    images: [],
    setImages: (images) => set({ images }),
    createImage: async (image) => {
      const { images, dbContext } = get()
      set({ images: [...images, image] })
      if (dbContext) {
        await dbContext.images.create(image)
      }
    },
    getImagesByProjectId: async (projectId: string) => {
      const { dbContext, setImages } = get()
      const imageList = await dbContext.images.getByProjectId(projectId)
      setImages(imageList)
      return imageList
    },
    getImages: async () => {
      const { dbContext } = get()
      const allImages = await dbContext.images.get()
      return allImages
    },
    getImageWithAnnotations: async (imageId) => {
      const { dbContext } = get()
      const image = await dbContext.images.getImageWithAnnotations(imageId)
      if (!image) {
        throw new Error(`Image with id ${imageId} not found`)
      }
      return image
    },
    getImage: async (id) => {
      const { dbContext, images } = get()
      const image = images.find((image) => image.id === id)
      if (image) {
        set({ image })
        return image
      }
      const allImages = await dbContext.images.get()
      const foundImage = allImages.find((image) => image.id === id)
      if (foundImage) {
        set({ image: foundImage })
        return foundImage
      }
      return undefined
    },

    updateImage: async (id, updates) => {
      const { images, dbContext } = get()
      const updatedImages = images.map((image) =>
        image.id === id ? { ...image, ...updates } : image
      )
      set({ images: updatedImages })
      if (dbContext) {
        await dbContext.images.update(id, updates)
      }
    },
    deleteImage: async (id) => {
      const { images, dbContext } = get()
      const updatedImages = images.filter((image) => image.id !== id)
      set({ images: updatedImages })
      if (dbContext) {
        await dbContext.images.delete(id)
      }
    },
    getOrCreateImage: async (name, data, width, height, projectId) => {
      const { images } = get()
      let image = images.find(
        (img) => img.name === name && img.projectId === projectId
      )
      if (!image) {
        image = {
          id: crypto.randomUUID(),
          name,
          data,
          width,
          height,
          projectId,
          createdAt: new Date(),
        } as ImageData
        await get().createImage(image)
        const updatedImages = get().images
        image = updatedImages.find((img) => img.id === image!.id)
      }
      if (!image) {
        throw new Error("Failed to get or create image")
      }
      return image!
    },
  }))
)
