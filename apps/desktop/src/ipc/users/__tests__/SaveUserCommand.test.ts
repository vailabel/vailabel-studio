import { SaveUserCommand } from "../SaveUserCommand"
import { UserRepository } from "../../../db/models"

jest.mock("../../../db/models", () => ({
  UserRepository: { create: jest.fn() },
}))

describe("SaveUserCommand", () => {
  const command = new SaveUserCommand()
  const user = {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "admin",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  }

  it("should call UserRepository.create with user data", async () => {
    await command.handle({} as any, user as any)
    expect(UserRepository.create).toHaveBeenCalledWith({
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-02"),
    })
  })
})
