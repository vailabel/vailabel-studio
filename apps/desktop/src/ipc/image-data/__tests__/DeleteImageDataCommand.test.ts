import { DeleteImageDataCommand } from "../DeleteImageDataCommand"
import { ImageDataRepository } from "../../../db/models"

describe("DeleteImageDataCommand", () => {
  const command = new DeleteImageDataCommand()
  const imageData = { id: "1" }
  it("should call ImageDataRepository.destroy with imageData id", async () => {
    ImageDataRepository.destroy = jest.fn()
    await command.handle({} as any, imageData as any)
    expect(ImageDataRepository.destroy).toHaveBeenCalledWith({
      where: { id: "1" },
    })
  })
})
