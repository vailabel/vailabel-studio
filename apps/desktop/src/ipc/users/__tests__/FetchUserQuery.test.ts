import { FetchUserQuery } from "../FetchUserQuery"
import { UserRepository } from "../../../db/models"

jest.mock("../../../db/models", () => ({
  UserRepository: { findAll: jest.fn() },
}))

describe("FetchUserQuery", () => {
  const query = new FetchUserQuery()

  it("should have the correct channel name", () => {
    expect(query.channel).toBe("fetch:users")
  })

  it("should return mapped users with password as empty string", async () => {
    const mockUsers = [
      {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        password: "secret",
        role: "admin",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      },
    ]
    ;(UserRepository.findAll as jest.Mock).mockResolvedValue(mockUsers)
    const result = await query.handle({} as any)
    expect(result).toEqual([
      {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        password: "",
        role: "admin",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      },
    ])
    expect(UserRepository.findAll).toHaveBeenCalled()
  })
})
