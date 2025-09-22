import { Settings } from "@vailabel/core"

export interface ISettingsService {
  getSettings(): Promise<Settings[]>
  getSetting(key: string): Promise<Settings | undefined>
  saveOrUpdateSetting(key: string, value: string): Promise<void>
  deleteSetting(key: string): Promise<void>
}
