import { AIModel } from "../../../models";
import { DataAccess } from "../../contracts/DataAccess";
import { IAIModelDataAccess } from "../../contracts/IDataAccess";
export declare class AIModelDataAccess extends DataAccess<AIModel> implements IAIModelDataAccess {
    constructor();
}
