import { History } from "../../../models";
import { IHistoryDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class HistoryDataAccess extends SQLiteDataAccess<History> implements IHistoryDataAccess {
    constructor();
}
