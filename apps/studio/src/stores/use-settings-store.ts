import { Settings } from "@vailabel/core"
import { create } from "zustand"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { exceptionMiddleware } from "@/hooks/exception-middleware"

type SettingsStoreType = {
  /**
   * Settings store for managing application settings.
   * Provides methods to get, set, create, update, and delete settings.
   */
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void

  settings: Settings[]
  getSetting: (key: string) => Settings | undefined
  getSettings: () => Settings[]
  saveOrUpdateSettings: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),

    settings: [],
    getSetting: (key) => {
      const { settings } = get()
      return settings.find((setting) => setting.key === key)
    },
    getSettings: () => {
      const { settings, data } = get()
      data.fetchSettings().then((fetchedSettings) => {
        set({ settings: fetchedSettings })
      })

      return settings
    },
    saveOrUpdateSettings: async (key, value) => {
      const { data } = get()
      const setting: Settings = {
        id: crypto.randomUUID(),
        key,
        value,
      }
      await data.saveOrUpdateSettings(setting)
    },
  }))
)
