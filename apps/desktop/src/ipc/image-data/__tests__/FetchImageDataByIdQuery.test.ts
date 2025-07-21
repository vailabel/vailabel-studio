import { FetchImageDataByIdQuery } from "../FetchImageDataByIdQuery"
import { ImageDataRepository, AnnotationRepository } from "../../../db/models"

describe("FetchImageDataByIdQuery", () => {
  const query = new FetchImageDataByIdQuery()
  it("should return mapped image data with annotations", async () => {
    const mockImageData = {
      id: "1",
      url: "url",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
      projectId: "p1",
      annotations: [
        {
          id: "a1",
          labelId: "l1",
          color: "red",
          imageId: "1",
          name: "ann1",
          type: "rect",
          coordinates: [1, 2, 3, 4],
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-02"),
        },
      ],
      name: "img",
      data: "data",
      width: 100,
      height: 200,
    }
    jest
      .spyOn(ImageDataRepository, "findOne")
      .mockResolvedValue(mockImageData as any)
    const result = await query.handle({} as any, "1")
    expect(result).toEqual({
      id: "1",
      url: "url",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
      projectId: "p1",
      annotations: [
        {
          id: "a1",
          labelId: "l1",
          color: "red",
          imageId: "1",
          name: "ann1",
          type: "rect",
          coordinates: [1, 2, 3, 4],
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-02"),
        },
      ],
      name: "img",
      data: "data",
      width: 100,
      height: 200,
    })
    expect(ImageDataRepository.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
      include: [{ model: AnnotationRepository, as: "annotations" }],
    })
  })

  it("should return undefined if not found", async () => {
    jest.spyOn(ImageDataRepository, "findOne").mockResolvedValue(null)
    const result = await query.handle({} as any, "notfound")
    expect(result).toBeUndefined()
  })
})
