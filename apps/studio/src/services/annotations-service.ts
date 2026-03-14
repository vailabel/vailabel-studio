import { Annotation } from "@vailabel/core"
import { request } from "./request"

export const annotationsService = {
  getAnnotationsByProjectId: (projectId: string) =>
    request<Annotation[]>("GET", `/projects/${projectId}/annotations`),
  getAnnotationsByImageId: (imageId: string) =>
    request<Annotation[]>("GET", `/images/${imageId}/annotations`),
  createAnnotation: (annotation: Partial<Annotation>) =>
    request<Annotation>("POST", "/annotations", annotation),
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) =>
    request<Annotation>("PUT", `/annotations/${annotationId}`, updates),
  deleteAnnotation: (annotationId: string) =>
    request<{ success: boolean }>("DELETE", `/annotations/${annotationId}`),
}
