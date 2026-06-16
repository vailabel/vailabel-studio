import { Annotation } from "@/shared/types/core"
import { studioCommands } from "@/shared/ipc/studio"

export const annotationsService = {
  getAnnotationsByProjectId: (projectId: string) =>
    studioCommands.annotationsListByProject(projectId),
  getAnnotationsByImageId: (imageId: string) =>
    studioCommands.annotationsListByImage(imageId),
  createAnnotation: (annotation: Partial<Annotation>) =>
    studioCommands.annotationsSave(annotation),
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) =>
    studioCommands.annotationsSave({ id: annotationId, ...updates }),
  deleteAnnotation: (annotationId: string) =>
    studioCommands.annotationsDelete(annotationId),
}

