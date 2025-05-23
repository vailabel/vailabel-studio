import { IAIModelDataAccess, IAnnotationDataAccess, IHistoryDataAccess, IImageDataAccess, ILabelDataAccess, IProjectDataAccess } from "./IDataAccess";
import { ISettingsDataAccess } from "@vailabel/core/src/data/contracts/IDataAccess";
export interface IDBContext {
    projects: IProjectDataAccess;
    images: IImageDataAccess;
    aiModels: IAIModelDataAccess;
    annotations: IAnnotationDataAccess;
    labels: ILabelDataAccess;
    settings: ISettingsDataAccess;
    history: IHistoryDataAccess;
}
