import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { ProjectService } from "./implementations/ProjectService"
import { LabelService } from "./implementations/LabelService"
import { ImageDataService } from "./implementations/ImageDataService"
import { AnnotationService } from "./implementations/AnnotationService"
import { SettingsService } from "./implementations/SettingsService"
import { UserService } from "./implementations/UserService"
import { AIModelService } from "./implementations/AIModelService"
import { TaskService } from "./implementations/TaskService"
import { IProjectService } from "./contracts/IProjectService"
import { ILabelService } from "./contracts/ILabelService"
import { IImageDataService } from "./contracts/IImageDataService"
import { IAnnotationService } from "./contracts/IAnnotationService"
import { ISettingsService } from "./contracts/ISettingsService"
import { IUserService } from "./contracts/IUserService"
import { IAIModelService } from "./contracts/IAIModelService"
import { ITaskService } from "./contracts/ITaskService"

export class ServiceContainer {
  private projectService: IProjectService
  private labelService: ILabelService
  private imageDataService: IImageDataService
  private annotationService: IAnnotationService
  private settingsService: ISettingsService
  private userService: IUserService
  private aiModelService: IAIModelService
  private taskService: ITaskService

  constructor(dataAdapter: IDataAdapter) {
    this.projectService = new ProjectService(dataAdapter)
    this.labelService = new LabelService(dataAdapter)
    this.imageDataService = new ImageDataService(dataAdapter)
    this.annotationService = new AnnotationService(dataAdapter)
    this.settingsService = new SettingsService(dataAdapter)
    this.userService = new UserService(dataAdapter)
    this.aiModelService = new AIModelService(dataAdapter)
    this.taskService = new TaskService(dataAdapter)
  }

  getProjectService(): IProjectService {
    return this.projectService
  }

  getLabelService(): ILabelService {
    return this.labelService
  }

  getImageDataService(): IImageDataService {
    return this.imageDataService
  }

  getAnnotationService(): IAnnotationService {
    return this.annotationService
  }

  getSettingsService(): ISettingsService {
    return this.settingsService
  }

  getUserService(): IUserService {
    return this.userService
  }

  getAIModelService(): IAIModelService {
    return this.aiModelService
  }

  getTaskService(): ITaskService {
    return this.taskService
  }
}

// Global service container instance
let serviceContainer: ServiceContainer | null = null

export function initializeServices(dataAdapter: IDataAdapter): void {
  serviceContainer = new ServiceContainer(dataAdapter)
}

export function getServices(): ServiceContainer {
  if (!serviceContainer) {
    throw new Error("Services not initialized. Call initializeServices() first.")
  }
  return serviceContainer
}
