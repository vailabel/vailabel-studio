import {  Settings } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"

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
  createSetting: (setting: Settings) => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  deleteSetting: (key: string) => Promise<void>
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
      const { settings } = get()
      return settings
    },
    createSetting: async (setting) => {
      const { data } = get()
      await data.saveSettings(setting)
      set((state) => ({
        settings: [...state.settings, setting],
      }))
    },
    updateSetting: async (key, value) => {
      const { data } = get()
      const setting = get().getSetting(key)
      if (setting) {
        const updatedSetting = { ...setting, value }
        await data.saveSettings(updatedSetting)
        set((state) => ({
          settings: state.settings.map((s) =>
            s.key === key ? updatedSetting : s
          ),
        }))
      } else {
        throw new Error(`Setting with key ${key} not found`)
      }
    }
    ,
    deleteSetting: async (key) => {
      // TODO: Implement delete logic in IDataAdapter
      set((state) => ({
        settings: state.settings.filter((s) => s.key !== key),
      }))
    }
  }))
)
