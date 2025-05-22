import { DataAccess, IProjectDataAccess } from "@vailabel/core/src/data";
import { Project } from "../../../models/types";
export declare class ProjectDataAccess extends DataAccess<Project> implements IProjectDataAccess {
    constructor();
}
