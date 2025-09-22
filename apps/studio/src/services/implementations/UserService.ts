import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { IUserService } from "../contracts/IUserService"
import { User } from "@vailabel/core"

export class UserService implements IUserService {
  private dataAdapter: IDataAdapter

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getUsers(): Promise<User[]> {
    return await this.dataAdapter.fetchUsers()
  }

  async createUser(user: User): Promise<void> {
    await this.dataAdapter.saveUser(user)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await this.dataAdapter.updateUser(userId, updates)
  }

  async deleteUser(userId: string): Promise<void> {
    await this.dataAdapter.deleteUser(userId)
  }

  async login(username: string, password: string): Promise<User> {
    return await this.dataAdapter.login(username, password)
  }

  async logout(): Promise<void> {
    await this.dataAdapter.logout()
  }
}
