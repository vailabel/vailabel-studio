import { AIModel } from "../../../models";
import { IAIModelDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class AIModelDataAccess extends SQLiteDataAccess<AIModel> implements IAIModelDataAccess {
    constructor();
}
