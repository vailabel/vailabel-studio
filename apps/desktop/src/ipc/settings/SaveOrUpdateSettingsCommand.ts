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
      // Only update value and updatedAt, exclude id to avoid unique constraint violation
      await SettingsRepository.update(
        {
          value: settings.value,
          updatedAt: new Date(),
        },
        {
          where: { key: settings.key },
        }
      )
    } else {
      await SettingsRepository.create({
        id: settings.id,
        key: settings.key,
        value: settings.value,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }
}
