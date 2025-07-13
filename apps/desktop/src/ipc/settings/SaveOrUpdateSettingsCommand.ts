import { Settings } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { SettingsRepository } from "../../db/models"

export class SaveOrUpdateSettingsCommand implements IpcHandler<Settings, void> {
  channel = "saveOrUpdate:settings"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    settings: Settings
  ): Promise<void> {
    const existingSettings = await SettingsRepository.findOne({
      where: { key: settings.key },
    })
    if (existingSettings) {
      await SettingsRepository.update(settings, {
        where: { key: settings.key },
      })
    } else {
      await SettingsRepository.create({
        id: settings.id,
        key: settings.key,
        value: settings.value,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      })
    }
  }
}
