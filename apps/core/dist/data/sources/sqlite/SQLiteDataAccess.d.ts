/// <reference types="@vailabel/core/type" />
import { IDataAccess } from "@vailabel/core/src/data/interface/IDataAccess";
import { Project, ImageData, Annotation, Label, History, AIModel, Settings } from "../../../models/types";
export declare class SQLiteDataAccess implements IDataAccess {
    getAvailableModels(): Promise<AIModel[]>;
    uploadCustomModel(model: AIModel): Promise<void>;
    selectModel(modelId: string): Promise<void>;
    getSelectedModel(): Promise<AIModel | undefined>;
    deleteModel(modelId: string): Promise<void>;
    getProjectWithImages(id: string): Promise<(Project & {
        images: ImageData[];
    }) | undefined>;
    getProjectById(id: string): Promise<Project | undefined>;
    createProject(project: Project): Promise<void>;
    updateProject(id: string, updates: Partial<Project>): Promise<void>;
    deleteProject(id: string): Promise<void>;
    getImages(projectId: string): Promise<ImageData[]>;
    getImagesWithPagination(projectId: string, offset: number, limit: number): Promise<ImageData[]>;
    getNextImageId(currentImageId: string): Promise<string | null>;
    getPreviousImageId(currentImageId: string): Promise<string | null>;
    createImage(image: ImageData): Promise<void>;
    updateImage(id: string, updates: Partial<ImageData>): Promise<void>;
    deleteImage(id: string): Promise<void>;
    getAnnotations(imageId: string): Promise<Annotation[]>;
    getAnnotationsWithFilter(imageId: string, filter: Partial<Annotation>): Promise<Annotation[]>;
    createAnnotation(annotation: Annotation): Promise<void>;
    updateAnnotation(id: string, updates: Partial<Annotation>): Promise<void>;
    deleteAnnotation(id: string): Promise<void>;
    createLabel(label: Label): Promise<void>;
    getLabels(): Promise<Label[]>;
    getLabelById(id: string): Promise<Label | undefined>;
    updateLabel(id: string, updates: Partial<Label>): Promise<void>;
    deleteLabel(id: string): Promise<void>;
    getSettings(): Promise<Settings[]>;
    getSetting(key: string): Promise<Settings | undefined>;
    updateSetting(key: string, value: string): Promise<void>;
    getHistory(): Promise<History[]>;
    updateHistory(history: History): Promise<void>;
    getProjects(): Promise<Project[]>;
}
