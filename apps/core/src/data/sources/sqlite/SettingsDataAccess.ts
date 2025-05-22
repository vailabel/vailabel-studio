import { Settings } from "../../../models/types"
import { ISettingsDataAccess } from "../../interface/IDataAccess"
import { DataAccess } from "./DataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class SettingsDataAccess
  extends DataAccess<Settings>
  implements ISettingsDataAccess
{
  constructor() {
    super("settings")
  }
  // You can add entity-specific methods here if needed
}
