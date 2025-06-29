import {
  AIModel,
  Annotation,
  History,
  ImageData,
  Label,
  Project,
  Settings,
} from "@vailabel/core"

export interface IBaseRepository<T = any> {
  get(): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(item: T): Promise<void>
  update(id: string, updates: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
  paginate(offset: number, limit: number): Promise<T[]>
}

export interface IImageRepository extends IBaseRepository<ImageData> {
  countByProjectId(projectId: string): Promise<number>
  getByProjectId(projectId: string): Promise<ImageData[]>
  getNext(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasNext: boolean }>
  getPrevious(
    projectId: string,
    currentImageId: string
  ): Promise<{ id: string | undefined; hasPrevious: boolean }>

  getImageWithAnnotations(imageId: string): Promise<ImageData | null>
}
export interface IProjectRepository extends IBaseRepository<Project> {}
export interface IAnnotationRepository extends IBaseRepository<Annotation> {
  countByProjectId(projectId: string): Promise<number>
  getByProjectId(projectId: string): Promise<Annotation[]>
}
export interface ILabelRepository extends IBaseRepository<Label> {
  countByProjectId(projectId: string): Promise<number>
  getByProjectId(projectId: string): Promise<Label[]>
}
export interface ISettingsRepository extends IBaseRepository<Settings> {
  getByKey(key: string): Promise<Settings | null>
  updateByKey(key: string, value: any): Promise<void>
  deleteByKey(key: string): Promise<void>
}
export interface IHistoryRepository extends IBaseRepository<History> {}
export interface IAIModelRepository extends IBaseRepository<AIModel> {}
