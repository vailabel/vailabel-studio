import { FetchHistoryQuery } from "../FetchHistoryQuery"
import { HistoryRepository } from "../../../db/models"

describe("FetchHistoryQuery", () => {
  const query = new FetchHistoryQuery()
  it("should return mapped history array", async () => {
    const mockHistoryArr = [
      {
        id: "1",
        historyIndex: 2,
        canUndo: true,
        canRedo: false,
      },
    ]
    jest
      .spyOn(HistoryRepository, "findAll")
      .mockResolvedValue(mockHistoryArr as any)
    const result = await query.handle({} as any)
    expect(result).toEqual(mockHistoryArr)
    expect(HistoryRepository.findAll).toHaveBeenCalled()
  })

  it("should return empty array if none found", async () => {
    jest.spyOn(HistoryRepository, "findAll").mockResolvedValue([])
    const result = await query.handle({} as any)
    expect(result).toEqual([])
  })
})
