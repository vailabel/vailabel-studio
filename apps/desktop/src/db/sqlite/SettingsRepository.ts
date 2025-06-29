import { Settings } from "@vailabel/core"
import { BaseRepository } from "./BaseRepository"
import { ISettingsRepository } from "./IBaseRepository"

export class SettingsRepository
  extends BaseRepository<Settings>
  implements ISettingsRepository
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
