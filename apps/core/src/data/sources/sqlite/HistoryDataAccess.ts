import { History } from "../../../models/types"
import { IHistoryDataAccess } from "../../interface/IDataAccess"
import { DataAccess } from "./DataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class HistoryDataAccess
  extends DataAccess<History>
  implements IHistoryDataAccess
{
  constructor() {
    super("history")
  }
  // You can add entity-specific methods here if needed
}
