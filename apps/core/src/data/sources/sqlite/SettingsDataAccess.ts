import { Settings } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { ISettingsDataAccess } from "../../contracts/IDataAccess"

export class SettingsDataAccess
  extends DataAccess<Settings>
  implements ISettingsDataAccess
{
  constructor() {
    super("settings")
  }
  // You can add entity-specific methods here if needed
}
