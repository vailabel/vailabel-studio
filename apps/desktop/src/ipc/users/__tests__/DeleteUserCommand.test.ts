import { UserRepository } from "../../../db/models"
import { DeleteUserCommand } from "../DeleteUserCommand"

jest.mock("../../../db/models", () => ({
  UserRepository: { destroy: jest.fn() },
}))

describe("DeleteUserCommand", () => {
  const command = new DeleteUserCommand()

  it("should have the correct channel name", () => {
    expect(command.channel).toBe("delete:users")
  })

  it("should call UserRepository.destroy with correct userId", async () => {
    const userId = "test-user-id"
    await command.handle({} as any, userId)
    expect(UserRepository.destroy).toHaveBeenCalledWith({
      where: { id: userId },
    })
  })
})
