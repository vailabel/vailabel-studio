import { FetchAIModelQuery } from "../FetchAIModelQuery"
import { AIModelRepository } from "../../../db/models"

describe("FetchAIModelQuery", () => {
  const query = new FetchAIModelQuery()
  it("should return mapped aiModel array", async () => {
    const mockAIModels = [
      {
        id: "1",
        name: "Model 1",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        description: "desc",
        version: "v1",
        modelPath: "/path/model",
        configPath: "/path/config",
        modelSize: 123,
        isCustom: true,
      },
    ]
    jest
      .spyOn(AIModelRepository, "findAll")
      .mockResolvedValue(mockAIModels as any)
    const result = await query.handle({} as any)
    expect(result).toEqual(mockAIModels)
    expect(AIModelRepository.findAll).toHaveBeenCalled()
  })

  it("should return empty array if none found", async () => {
    jest.spyOn(AIModelRepository, "findAll").mockResolvedValue([])
    const result = await query.handle({} as any)
    expect(result).toEqual([])
  })
})
