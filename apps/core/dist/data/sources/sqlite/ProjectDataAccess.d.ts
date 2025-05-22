import { Project } from "../../../models/types";
import { IProjectDataAccess } from "../../interface/IDataAccess";
import { DataAccess } from './DataAccess';
export declare class ProjectDataAccess extends DataAccess<Project> implements IProjectDataAccess {
    constructor();
}
