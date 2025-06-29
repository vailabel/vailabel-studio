import { Annotation } from "../../../models";
import { IAnnotationDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class AnnotationDataAccess extends SQLiteDataAccess<Annotation> implements IAnnotationDataAccess {
    constructor();
    countByProjectId(projectId: string): Promise<number>;
    getByProjectId(projectId: string): Promise<Annotation[]>;
}
