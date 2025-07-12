import { User } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { UserRepository } from "../../db/models"

export class FetchUserQuery implements IpcHandler<void, User[]> {
  channel = "fetch:users"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _req?: void
  ): Promise<User[]> {
    const userList = await UserRepository.findAll()
    return userList.map((user) => {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    })
  }
}
