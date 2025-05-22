import { Annotation } from "../../../models/types";
import { IAnnotationDataAccess } from "../../interface/IDataAccess";
import { DataAccess } from "./DataAccess";
export declare class AnnotationDataAccess extends DataAccess<Annotation> implements IAnnotationDataAccess {
    constructor();
}
