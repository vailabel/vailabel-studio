import { History } from "@vailabel/core"
import { DataAccess } from "@vailabel/core/data"
import { IHistoryDataAccess } from "@vailabel/core/data"

export class HistoryDataAccess
  extends DataAccess<History>
  implements IHistoryDataAccess
{
  constructor() {
    super(History)
  }
  // You can add entity-specific methods here if needed
}
