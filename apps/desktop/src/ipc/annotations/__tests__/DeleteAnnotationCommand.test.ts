import { DeleteAnnotationCommand } from "../DeleteAnnotationCommand"
import { AnnotationRepository } from "../../../db/models"

describe("DeleteAnnotationCommand", () => {
  const command = new DeleteAnnotationCommand()
  const annotation = { id: "1" }

  it("should call AnnotationRepository.destroy with annotation id", async () => {
    AnnotationRepository.destroy = jest.fn()
    await command.handle({} as any, annotation as any)
    expect(AnnotationRepository.destroy).toHaveBeenCalledWith({
      where: { id: annotation.id },
    })
  })
})
