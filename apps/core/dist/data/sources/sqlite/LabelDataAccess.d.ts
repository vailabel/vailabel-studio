import { Label } from "../../../models";
import { ILabelDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class LabelDataAccess extends SQLiteDataAccess<Label> implements ILabelDataAccess {
    constructor();
    countByProjectId(projectId: string): Promise<number>;
    getByProjectId(projectId: string): Promise<Label[]>;
}
