import { FetchImageDataQuery } from "../FetchImageDataQuery"
import { ImageDataRepository, AnnotationRepository } from "../../../db/models"

describe("FetchImageDataQuery", () => {
  const query = new FetchImageDataQuery()
  it("should return mapped image data array", async () => {
    const mockImageDataArr = [
      {
        id: "1",
        url: "url1",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        projectId: "p1",
        name: "img1",
        data: "data1",
        width: 100,
        height: 200,
      },
    ]
    jest
      .spyOn(ImageDataRepository, "findAll")
      .mockResolvedValue(mockImageDataArr as any)
    const result = await query.handle({} as any)
    expect(result).toEqual(mockImageDataArr)
    expect(ImageDataRepository.findAll).toHaveBeenCalled()
  })

  it("should return empty array if none found", async () => {
    jest.spyOn(ImageDataRepository, "findAll").mockResolvedValue([])
    const result = await query.handle({} as any)
    expect(result).toEqual([])
  })
})
