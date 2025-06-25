import { Label } from "../../../models";
import { DataAccess } from "../../contracts/DataAccess";
import { ILabelDataAccess } from "../../contracts/IDataAccess";
export declare class LabelDataAccess extends DataAccess<Label> implements ILabelDataAccess {
    constructor();
    countByProjectId(projectId: string): Promise<number>;
    getByProjectId(projectId: string): Promise<Label[]>;
}
