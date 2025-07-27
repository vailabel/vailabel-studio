import { UpdateAnnotationCommand, UpdateAnnotationRequest } from "../UpdateAnnotationCommand"
import { AnnotationRepository } from "../../../db/models"

describe("UpdateAnnotationCommand", () => {
  const command = new UpdateAnnotationCommand()
  it("should call AnnotationRepository.update with annotation data and id", async () => {
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
    AnnotationRepository.update = jest.fn()
    await command.handle({} as any, { id: annotation.id, updates: annotation } as UpdateAnnotationRequest)
    expect(AnnotationRepository.update).toHaveBeenCalledWith(annotation, {
      where: { id: annotation.id },
    })
  })
})
