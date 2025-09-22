import { Annotation } from "@vailabel/core"

export interface IAnnotationService {
  getAnnotationsByProjectId(projectId: string): Promise<Annotation[]>
  getAnnotationsByImageId(imageId: string): Promise<Annotation[]>
  createAnnotation(annotation: Annotation): Promise<void>
  updateAnnotation(annotationId: string, updates: Partial<Annotation>): Promise<void>
  deleteAnnotation(annotationId: string): Promise<void>
}
