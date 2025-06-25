import { Project } from "../../../models";
import { DataAccess } from "../../contracts/DataAccess";
import { IProjectDataAccess } from "../../contracts/IDataAccess";
export declare class ProjectDataAccess extends DataAccess<Project> implements IProjectDataAccess {
    constructor();
}
