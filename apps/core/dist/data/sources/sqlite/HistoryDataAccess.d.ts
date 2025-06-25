import { History } from "../../../models";
import { DataAccess } from "../../contracts/DataAccess";
import { IHistoryDataAccess } from "../../contracts/IDataAccess";
export declare class HistoryDataAccess extends DataAccess<History> implements IHistoryDataAccess {
    constructor();
}
