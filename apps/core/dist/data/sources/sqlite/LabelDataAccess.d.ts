import { ILabelDataAccess } from "../../interface/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class LabelDataAccess extends SQLiteDataAccess implements ILabelDataAccess {
    constructor();
}
