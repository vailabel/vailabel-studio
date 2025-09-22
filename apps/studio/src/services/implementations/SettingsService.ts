import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { ISettingsService } from "../contracts/ISettingsService"
import { Settings } from "@vailabel/core"

export class SettingsService implements ISettingsService {
  private dataAdapter: IDataAdapter
  private settingsCache: Settings[] = []

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getSettings(): Promise<Settings[]> {
    if (this.settingsCache.length === 0) {
      this.settingsCache = await this.dataAdapter.fetchSettings()
    }
    return this.settingsCache
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    const settings = await this.getSettings()
    return settings.find(setting => setting.key === key)
  }

  async saveOrUpdateSetting(key: string, value: string): Promise<void> {
    const settings = await this.getSettings()
    const existingSetting = settings.find(setting => setting.key === key)
    
    if (existingSetting) {
      // Update existing setting
      await this.dataAdapter.saveOrUpdateSettings({
        ...existingSetting,
        value,
        updatedAt: new Date()
      })
      // Update cache
      const index = this.settingsCache.findIndex(s => s.key === key)
      if (index !== -1) {
        this.settingsCache[index] = { ...existingSetting, value, updatedAt: new Date() }
      }
    } else {
      // Create new setting
      const newSetting: Settings = {
        id: crypto.randomUUID(),
        key,
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.dataAdapter.saveOrUpdateSettings(newSetting)
      this.settingsCache.push(newSetting)
    }
  }

  async deleteSetting(key: string): Promise<void> {
    const settings = await this.getSettings()
    const setting = settings.find(s => s.key === key)
    if (setting) {
      // Note: This would need to be implemented in the data adapter
      // For now, we'll just remove from cache
      this.settingsCache = this.settingsCache.filter(s => s.key !== key)
    }
  }
}
