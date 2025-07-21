import { UpdateUserCommand } from "../UpdateUserCommand"
import { UserRepository } from "../../../db/models"

jest.mock("../../../db/models", () => ({
  UserRepository: { update: jest.fn() },
}))

describe("UpdateUserCommand", () => {
  const command = new UpdateUserCommand()
  const user = {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "admin",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  }

  it("should call UserRepository.update with user data and id", async () => {
    await command.handle({} as any, user as any)
    expect(UserRepository.update).toHaveBeenCalledWith(user, {
      where: { id: user.id },
    })
  })
})
