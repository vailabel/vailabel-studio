import { Settings } from "@/types/core"
import { studioCommands } from "@/ipc/studio"

export const settingsService = {
  list: () => studioCommands.settingsList(),
  getByKey: (key: string) => studioCommands.settingsGet(key),
  update: (key: string, value: string) => studioCommands.settingsSet(key, value),
}

