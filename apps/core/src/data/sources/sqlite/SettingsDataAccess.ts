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
  async getByKey(key: string): Promise<Settings | null> {
    const row = await window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE key = ?`,
      [key],
    ])
    if (row) {
      // Parse the value field from JSON string to object
      return { ...row, value: JSON.parse(row.value) }
    }
    return null
  }
  updateByKey(key: string, value: any): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      `UPDATE ${this.table} SET value = ? WHERE key = ?`,
      [JSON.stringify(value), key],
    ])
  }
  deleteByKey(key: string): Promise<void> {
    return window.ipc.invoke("sqlite:run", [
      `DELETE FROM ${this.table} WHERE key = ?`,
      [key],
    ])
  }
}
