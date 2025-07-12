import { Project } from "../../../models";
import { IProjectDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class ProjectDataAccess extends SQLiteDataAccess<Project> implements IProjectDataAccess {
    constructor();
}
