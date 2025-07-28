import { DeleteAnnotationCommand } from "../DeleteAnnotationCommand"
import { AnnotationRepository } from "../../../db/models"

describe("DeleteAnnotationCommand", () => {
  const command = new DeleteAnnotationCommand()
  const annotationId = "test-annotation-id"

  it("should call AnnotationRepository.destroy with annotation id", async () => {
    AnnotationRepository.destroy = jest.fn()
    await command.handle({} as any, annotationId)
    expect(AnnotationRepository.destroy).toHaveBeenCalledWith({
      where: { id: annotationId },
    })
  })
})
