import { Settings } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { SettingsRepository } from "../../db/models"

export class FetchSettingsQuery implements IpcHandler<void, Settings[]> {
  channel = "fetch:settings"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _request: void
  ): Promise<Settings[]> {
    const settings = await SettingsRepository.findAll({})
    return settings.map((setting) => {
      return {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      }
    })
  }
}
