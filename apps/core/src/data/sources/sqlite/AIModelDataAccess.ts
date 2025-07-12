import { AIModel } from "../../../models"
import { DataAccess } from "../../contracts/DataAccess"
import { IAIModelDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class AIModelDataAccess
  extends SQLiteDataAccess<AIModel>
  implements IAIModelDataAccess
{
  constructor() {
    super(AIModel)
  }
}
