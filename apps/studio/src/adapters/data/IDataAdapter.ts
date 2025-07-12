import {
    Project,
    Label,
    Annotation,
    ImageData,
    History,
    Task,
    AIModel,
    Settings,
    User,
} from '@vailabel/core'


export interface IDataAdapter {
    // project management
    fetchProjects(): Promise<Project[]>;
    saveProject(project: Project): Promise<void>;
    updateProject(projectId: string, updates: Partial<Project>): Promise<void>;
    deleteProject(projectId: string): Promise<void>;
    // label management
    fetchLabels(projectId: string): Promise<Label[]>;
    saveLabel(label: Label): Promise<void>;
    updateLabel(labelId: string, updates: Partial<Label>): Promise<void>;
    deleteLabel(labelId: string): Promise<void>;

    // annotation management
    fetchAnnotations(projectId: string): Promise<Annotation[]>;
    saveAnnotation(annotation: Annotation): Promise<void>;
    deleteAnnotation(annotationId: string): Promise<void>;
    updateAnnotation(annotationId: string, updates: Partial<Annotation>): Promise<void>;

    // image data management
    fetchImageData(projectId: string): Promise<ImageData[]>;
    saveImageData(imageData: ImageData): Promise<void>;
    updateImageData(imageId: string, updates: Partial<ImageData>): Promise<void>;
    deleteImageData(imageId: string): Promise<void>;    

    // history management
    fetchHistory(projectId: string): Promise<History[]>;
    saveHistory(history: History): Promise<void>;
    updateHistory(historyId: string, updates: Partial<History>): Promise<void>;
    deleteHistory(historyId: string): Promise<void>;
    // task management
    fetchTasks(projectId: string): Promise<Task[]>;
    saveTask(task: Task): Promise<void>;
    updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
    deleteTask(taskId: string): Promise<void>;  
    // AI model management
    fetchAIModels(projectId: string): Promise<AIModel[]>;
    saveAIModel(aiModel: AIModel): Promise<void>;
    updateAIModel(aiModelId: string, updates: Partial<AIModel>): Promise<void>;
    deleteAIModel(aiModelId: string): Promise<void>;
    // settings management
    fetchSettings(projectId: string): Promise<Settings>;
    saveSettings(settings: Settings): Promise<void>;
    // user management
    fetchUsers(): Promise<User[]>;
    saveUser(user: User): Promise<void>;
    updateUser(userId: string, updates: Partial<User>): Promise<void>;
    deleteUser(userId: string): Promise<void>;
    // authentication
    login(username: string, password: string): Promise<User>;
    logout(): Promise<void>;
    // data synchronization
    syncData(): Promise<void>;
    
}