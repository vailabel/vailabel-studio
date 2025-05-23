import { History } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { IHistoryDataAccess } from "../../contracts/IDataAccess"

export class HistoryDataAccess
  extends DataAccess<History>
  implements IHistoryDataAccess
{
  constructor() {
    super("history")
  }
  // You can add entity-specific methods here if needed
}
