import { AIModelDataAccess } from "./AIModelDataAccess";
import { AnnotationDataAccess } from "./AnnotationDataAccess";
import { HistoryDataAccess } from "./HistoryDataAccess";
import { ImageDataAccess } from "./ImageDataAccess";
import { LabelDataAccess } from "./LabelDataAccess";
import { ProjectDataAccess } from "./ProjectDataAccess";
import { SettingsDataAccess } from "./SettingsDataAccess";
import { IDBContext } from "../../contracts/IDBContext";
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
