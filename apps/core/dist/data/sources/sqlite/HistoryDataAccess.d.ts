import { History } from "../../../models/types";
import { IHistoryDataAccess } from "../../interface/IDataAccess";
import { DataAccess } from "./DataAccess";
export declare class HistoryDataAccess extends DataAccess<History> implements IHistoryDataAccess {
    constructor();
}
