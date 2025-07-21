import { SaveAnnotationCommand } from "../SaveAnnotationCommand"
import { AnnotationRepository } from "../../../db/models"

describe("SaveAnnotationCommand", () => {
  const command = new SaveAnnotationCommand()
  it("should call AnnotationRepository.create with annotation data", async () => {
    const annotation = {
      id: "1",
      labelId: "l1",
      imageId: "img1",
      coordinates: [{ x: 1, y: 2 }],
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
      name: "ann1",
      type: "rect",
    }
    AnnotationRepository.create = jest.fn()
    await command.handle({} as any, annotation as any)
    expect(AnnotationRepository.create).toHaveBeenCalledWith(annotation)
  })
})
