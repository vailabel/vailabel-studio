import { User } from "@vailabel/core"

export interface IUserService {
  getUsers(): Promise<User[]>
  createUser(user: User): Promise<void>
  updateUser(userId: string, updates: Partial<User>): Promise<void>
  deleteUser(userId: string): Promise<void>
  login(username: string, password: string): Promise<User>
  logout(): Promise<void>
}
