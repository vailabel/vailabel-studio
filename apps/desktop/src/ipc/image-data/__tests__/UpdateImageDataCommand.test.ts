import { UpdateImageDataCommand } from "../UpdateImageDataCommand"
import { ImageDataRepository } from "../../../db/models"

describe("UpdateImageDataCommand", () => {
  const command = new UpdateImageDataCommand()
  it("should call update with correct args", async () => {
    const mockInput = {
      id: "1",
      url: "url",
      projectId: "p1",
      name: "img",
      data: "data",
      width: 100,
      height: 200,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updateSpy = jest
      .spyOn(ImageDataRepository, "update")
      .mockResolvedValue([1] as any)
    await command.handle({} as any, mockInput as any)
    expect(updateSpy).toHaveBeenCalledWith(mockInput, { where: { id: "1" } })
  })
})
