import { Settings } from "../../../models"
import { ISettingsDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class SettingsDataAccess
  extends SQLiteDataAccess<Settings>
  implements ISettingsDataAccess
{
  constructor() {
    super(Settings)
  }

  async getByKey(key: string): Promise<Settings | null> {
    return (await window.ipc.invoke(
      "sqlite:getByKey",
      Settings.name,
      key
    )) as Promise<Settings | null>
  }

  async updateByKey(key: string, value: any): Promise<void> {
    ;(await window.ipc.invoke("sqlite:updateByKey", Settings.name, key, {
      value: JSON.stringify(value),
    })) as Promise<void>
  }

  async deleteByKey(key: string): Promise<void> {
    ;(await window.ipc.invoke(
      "sqlite:deleteByKey",
      Settings.name,
      key
    )) as Promise<void>
  }
}
