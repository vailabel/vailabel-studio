import { History } from "../../../models"
import { IHistoryDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class HistoryDataAccess
  extends SQLiteDataAccess<History>
  implements IHistoryDataAccess
{
  constructor() {
    super(History)
  }
  // You can add entity-specific methods here if needed
}
