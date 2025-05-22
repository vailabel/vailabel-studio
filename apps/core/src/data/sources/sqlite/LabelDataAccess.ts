import { Label } from "../../../models/types"
import { ILabelDataAccess } from "../../interface/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class LabelDataAccess
  extends SQLiteDataAccess
  implements ILabelDataAccess
{
  constructor() {
    super("labels")
  }
  // You can add entity-specific methods here if needed
}
