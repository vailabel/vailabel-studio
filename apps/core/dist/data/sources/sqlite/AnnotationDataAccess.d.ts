import { Annotation } from "../../../models/types";
import { DataAccess } from "../../contracts/DataAccess";
import { IAnnotationDataAccess } from "../../contracts/IDataAccess";
export declare class AnnotationDataAccess extends DataAccess<Annotation> implements IAnnotationDataAccess {
    constructor();
    countByProjectId(projectId: string): Promise<number>;
    getByProjectId(projectId: string): Promise<Annotation[]>;
}
