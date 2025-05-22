import { AIModel } from "../../../models/types"
import { IAIModelDataAccess } from "../../interface/IDataAccess"
import { DataAccess } from "./DataAccess"

export class AIModelDataAccess
  extends DataAccess<AIModel>
  implements IAIModelDataAccess
{
  constructor() {
    super("ai_models")
  }
}
