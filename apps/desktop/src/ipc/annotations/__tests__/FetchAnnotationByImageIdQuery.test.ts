import { FetchAnnotationByImageIdQuery } from "../FetchAnnotationByImageIdQuery"
import { AnnotationRepository } from "../../../db/models"

describe("FetchAnnotationByImageIdQuery", () => {
  const query = new FetchAnnotationByImageIdQuery()
  it("should return mapped annotation array for imageId", async () => {
    const mockAnnotations = [
      {
        id: "1",
        labelId: "l1",
        name: "ann1",
        type: "rect",
        coordinates: [{ x: 1, y: 2 }],
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        imageId: "img1",
        color: "red",
        isAIGenerated: false,
      },
    ]
    jest
      .spyOn(AnnotationRepository, "findAll")
      .mockResolvedValue(mockAnnotations as any)
    const result = await query.handle({} as any, "img1")
    expect(result).toEqual(mockAnnotations)
    expect(AnnotationRepository.findAll).toHaveBeenCalledWith({
      where: { imageId: "img1" },
    })
  })

  it("should return empty array if none found", async () => {
    jest.spyOn(AnnotationRepository, "findAll").mockResolvedValue([])
    const result = await query.handle({} as any, "notfound")
    expect(result).toEqual([])
  })
})
