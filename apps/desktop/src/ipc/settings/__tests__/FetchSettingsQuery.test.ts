import { FetchSettingsQuery } from "../FetchSettingsQuery"
import { SettingsRepository } from "../../../db/models"

describe("FetchSettingsQuery", () => {
  const query = new FetchSettingsQuery()

  it("should return mapped settings", async () => {
    const mockSettings = [
      {
        id: "1",
        key: "theme",
        value: "dark",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      },
    ]
    jest
      .spyOn(SettingsRepository, "findAll")
      .mockResolvedValue(mockSettings as any)
    const result = await query.handle({} as any, undefined)
    expect(result).toEqual([
      {
        id: "1",
        key: "theme",
        value: "dark",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      },
    ])
    expect(SettingsRepository.findAll).toHaveBeenCalled()
  })
})
