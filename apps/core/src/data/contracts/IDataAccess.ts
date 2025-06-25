import {
  AIModel,
  Annotation,
  History,
  ImageData,
  Label,
  Project,
  Settings,
} from "../../models"

export interface IDataAccess<T = any> {
  get(): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(item: T): Promise<void>
  update(id: string, updates: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
  paginate(offset: number, limit: number): Promise<T[]>
}

export interface IImageDataAccess extends IDataAccess<ImageData> {
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
export interface IProjectDataAccess extends IDataAccess<Project> {}
export interface IAnnotationDataAccess extends IDataAccess<Annotation> {
  countByProjectId(projectId: string): Promise<number>
  getByProjectId(projectId: string): Promise<Annotation[]>
}
export interface ILabelDataAccess extends IDataAccess<Label> {
  countByProjectId(projectId: string): Promise<number>
  getByProjectId(projectId: string): Promise<Label[]>
}
export interface ISettingsDataAccess extends IDataAccess<Settings> {
  getByKey(key: string): Promise<Settings | null>
  updateByKey(key: string, value: any): Promise<void>
  deleteByKey(key: string): Promise<void>
}
export interface IHistoryDataAccess extends IDataAccess<History> {}
export interface IAIModelDataAccess extends IDataAccess<AIModel> {}
