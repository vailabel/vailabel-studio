import { SaveImageDataCommand } from "../SaveImageDataCommand"
import { ImageDataRepository } from "../../../db/models"

describe("SaveImageDataCommand", () => {
  const command = new SaveImageDataCommand()
  it("should create image data", async () => {
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
    jest
      .spyOn(ImageDataRepository, "create")
      .mockResolvedValue(mockInput as any)
    await command.handle({} as any, mockInput as any)
    expect(ImageDataRepository.create).toHaveBeenCalledWith(mockInput)
  })

  it("should throw if create fails", async () => {
    jest
      .spyOn(ImageDataRepository, "create")
      .mockRejectedValue(new Error("fail"))
    await expect(command.handle({} as any, {} as any)).rejects.toThrow("fail")
  })
})
