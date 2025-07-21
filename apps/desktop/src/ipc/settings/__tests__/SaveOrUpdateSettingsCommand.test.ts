import { SaveOrUpdateSettingsCommand } from "../SaveOrUpdateSettingsCommand"
import { SettingsRepository } from "../../../db/models"

describe("SaveOrUpdateSettingsCommand", () => {
  const command = new SaveOrUpdateSettingsCommand()
  const settings = {
    id: "1",
    key: "theme",
    value: "dark",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  }

  it("should update settings if existing", async () => {
    jest.spyOn(SettingsRepository, "findOne").mockResolvedValue(settings as any)
    const updateSpy = jest
      .spyOn(SettingsRepository, "update")
      .mockResolvedValue(undefined as any)
    await command.handle({} as any, settings as any)
    expect(SettingsRepository.findOne).toHaveBeenCalledWith({
      where: { key: settings.key },
    })
    expect(updateSpy).toHaveBeenCalledWith(settings, {
      where: { key: settings.key },
    })
  })

  it("should create settings if not existing", async () => {
    jest.spyOn(SettingsRepository, "findOne").mockResolvedValue(null)
    const createSpy = jest
      .spyOn(SettingsRepository, "create")
      .mockResolvedValue(undefined as any)
    await command.handle({} as any, settings as any)
    expect(SettingsRepository.findOne).toHaveBeenCalledWith({
      where: { key: settings.key },
    })
    expect(createSpy).toHaveBeenCalledWith(settings)
  })
})
