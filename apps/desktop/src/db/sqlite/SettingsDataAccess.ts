import { Settings } from "@vailabel/core"
import { DataAccess } from "@vailabel/core/data"
import { ISettingsDataAccess } from "@vailabel/core/data"

export class SettingsDataAccess
  extends DataAccess<Settings>
  implements ISettingsDataAccess
{
  constructor() {
    super(Settings)
  }

  async getByKey(key: string): Promise<Settings | null> {
    return Settings.findOne({ where: { key } })
  }

  async updateByKey(key: string, value: any): Promise<void> {
    await Settings.update({ value: JSON.stringify(value) }, { where: { key } })
  }

  async deleteByKey(key: string): Promise<void> {
    await Settings.destroy({ where: { key } })
  }
}
