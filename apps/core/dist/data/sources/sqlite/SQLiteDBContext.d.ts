import { AIModel, Annotation, Label, Project, Settings, History, ImageData } from "@vailabel/core/models/types";
import { IDataAccess } from "../../interface/IDataAccess";
import { AIModelDataAccess } from "./AIModelDataAccess";
import { AnnotationDataAccess } from "./AnnotationDataAccess";
import { HistoryDataAccess } from "./HistoryDataAccess";
import { ImageDataAccess } from "./ImageDataAccess";
import { LabelDataAccess } from "./LabelDataAccess";
import { ProjectDataAccess } from "./ProjectDataAccess";
import { SettingsDataAccess } from "./SettingsDataAccess";
export interface IDBContext {
    projects: IDataAccess<Project>;
    images: IDataAccess<ImageData>;
    aiModels: IDataAccess<AIModel>;
    annotations: IDataAccess<Annotation>;
    labels: IDataAccess<Label>;
    settings: IDataAccess<Settings>;
    history: IDataAccess<History>;
}
export declare class SQLiteDBContext implements IDBContext {
    readonly projects: ProjectDataAccess;
    readonly images: ImageDataAccess;
    readonly aiModels: AIModelDataAccess;
    readonly annotations: AnnotationDataAccess;
    readonly labels: LabelDataAccess;
    readonly settings: SettingsDataAccess;
    readonly history: HistoryDataAccess;
    constructor();
}
