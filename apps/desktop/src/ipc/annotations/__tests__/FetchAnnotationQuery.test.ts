import { FetchAnnotationQuery } from "../FetchAnnotationQuery"
import { AnnotationRepository } from "../../../db/models"

describe("FetchAnnotationQuery", () => {
  const query = new FetchAnnotationQuery()
  it("should return mapped annotation array", async () => {
    const mockAnnotations = [
      {
        id: "1",
        labelId: "l1",
        imageId: "img1",
        coordinates: [{ x: 1, y: 2 }],
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        name: "ann1",
        type: "rect",
      },
    ]
    jest
      .spyOn(AnnotationRepository, "findAll")
      .mockResolvedValue(mockAnnotations as any)
    const result = await query.handle({} as any)
    expect(result).toEqual([
      {
        id: "1",
        labelId: "l1",
        imageId: "img1",
        coordinates: [{ x: 1, y: 2 }],
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        name: "ann1",
        type: "rect",
      },
    ])
    expect(AnnotationRepository.findAll).toHaveBeenCalled()
  })

  it("should return empty array if none found", async () => {
    jest.spyOn(AnnotationRepository, "findAll").mockResolvedValue([])
    const result = await query.handle({} as any)
    expect(result).toEqual([])
  })
})
