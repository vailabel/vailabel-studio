import { AIModel } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { IAIModelDataAccess } from "../../contracts/IDataAccess"

export class AIModelDataAccess
  extends DataAccess<AIModel>
  implements IAIModelDataAccess
{
  constructor() {
    super("ai_models")
  }
}
