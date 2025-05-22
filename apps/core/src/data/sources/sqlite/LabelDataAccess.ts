import { Label } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { ILabelDataAccess } from "../../contracts/IDataAccess"

export class LabelDataAccess
  extends DataAccess<Label>
  implements ILabelDataAccess
{
  constructor() {
    super("labels")
  }
  // You can add entity-specific methods here if needed
}
