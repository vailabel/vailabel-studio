import { IDBContext, Settings } from "@vailabel/core"
import { ISettingsDataAccess } from "@vailabel/core/src/data/contracts/IDataAccess"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

type SettingsStoreType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
  settings: Settings[]
  setSettings: (settings: Settings[]) => void
  getSetting: (key: string) => Settings | undefined
  getSettings: () => Settings[]
  createSetting: (setting: Settings) => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  deleteSetting: (key: string) => Promise<void>
}

export const useSettingsStore = create<SettingsStoreType>(
  exceptionMiddleware((set, get) => ({
    dbContext: {} as Omit<IDBContext, "settings"> & {
      settings: ISettingsDataAccess
    },
    initDBContext: (ctx) => set({ dbContext: ctx }),
    settings: [],
    setSettings: (settings) => set({ settings }),
    getSettings: () => {
      const { dbContext, setSettings, settings } = get()
      dbContext.settings.get().then((allSettings: Settings[]) => {
        setSettings(allSettings)
      })

      return settings
    },
    getSetting: (key) => {
      const { settings, dbContext, setSettings } = get()
      dbContext.settings.get().then((allSettings: Settings[]) => {
        setSettings(allSettings)
      })
      return settings.find((setting) => setting.key === key)
    },
    createSetting: async (setting) => {
      const { settings, dbContext } = get()
      // Prevent duplicate key
      if (settings.some((s) => s.key === setting.key)) {
        return
      }
      set({ settings: [...settings, setting] })
      if (dbContext) {
        await dbContext.settings.create(setting)
      }
    },
    updateSetting: async (key, value) => {
      const { settings, dbContext } = get()
      // Check if the setting exists
      const exists = await dbContext.settings.getByKey(key)
      let updatedSettings
      if (exists) {
        // Update existing setting
        updatedSettings = settings.map((setting) =>
          setting.key === key ? { ...setting, value } : setting
        )
        set({ settings: updatedSettings })
        if (dbContext) {
          await dbContext.settings.updateByKey(key, value)
        }
      } else {
        // Prevent duplicate key in state (should not happen, but for safety)
        if (settings.some((s) => s.key === key)) {
          return
        }
        // Create new setting
        const newSetting = { id: crypto.randomUUID(), key, value }
        updatedSettings = [...settings, newSetting]
        set({ settings: updatedSettings })
        if (dbContext) {
          await dbContext.settings.create(newSetting)
        }
      }
    },
    deleteSetting: async (key) => {
      const { settings, dbContext } = get()
      const updatedSettings = settings.filter((setting) => setting.key !== key)
      set({ settings: updatedSettings })
      if (dbContext) {
        await dbContext.settings.delete(key)
      }
    },
  }))
)
