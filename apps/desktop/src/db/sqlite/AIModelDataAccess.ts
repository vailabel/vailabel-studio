import { AIModel } from "@vailabel/core"
import { DataAccess } from "@vailabel/core/data"
import { IAIModelDataAccess } from "@vailabel/core/data"

export class AIModelDataAccess
  extends DataAccess<AIModel>
  implements IAIModelDataAccess
{
  constructor() {
    super(AIModel)
  }
}
