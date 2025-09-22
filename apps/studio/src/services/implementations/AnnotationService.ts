import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { IAnnotationService } from "../contracts/IAnnotationService"
import { Annotation } from "@vailabel/core"

export class AnnotationService implements IAnnotationService {
  private dataAdapter: IDataAdapter

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getAnnotationsByProjectId(projectId: string): Promise<Annotation[]> {
    return await this.dataAdapter.fetchAnnotations(projectId)
  }

  async getAnnotationsByImageId(imageId: string): Promise<Annotation[]> {
    return await this.dataAdapter.getAnnotationsByImageId(imageId)
  }

  async createAnnotation(annotation: Annotation): Promise<void> {
    await this.dataAdapter.saveAnnotation(annotation)
  }

  async updateAnnotation(annotationId: string, updates: Partial<Annotation>): Promise<void> {
    await this.dataAdapter.updateAnnotation(annotationId, updates)
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    await this.dataAdapter.deleteAnnotation(annotationId)
  }
}
