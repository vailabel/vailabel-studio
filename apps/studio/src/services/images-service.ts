import { ImageData } from "@vailabel/core"
import { request } from "./request"

export const imagesService = {
  getImagesByProjectId: (projectId: string) =>
    request<ImageData[]>("GET", `/projects/${projectId}/images`),
  getImage: (imageId: string) => request<ImageData>("GET", `/images/${imageId}`),
  getImageRange: (projectId: string, offset: number, limit: number) =>
    request<ImageData[]>(
      "GET",
      `/projects/${projectId}/images/range?offset=${offset}&limit=${limit}`
    ),
  createImage: (image: Partial<ImageData>) =>
    request<ImageData>("POST", "/images", image),
  updateImage: (imageId: string, updates: Partial<ImageData>) =>
    request<ImageData>("PUT", `/images/${imageId}`, updates),
  deleteImage: (imageId: string) =>
    request<{ success: boolean }>("DELETE", `/images/${imageId}`),
}
