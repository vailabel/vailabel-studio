import { User } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { UserRepository } from "../../db/models"

export class DeleteUserCommand implements IpcHandler<User, void> {
  channel = "delete:users"

  async handle(_event: Electron.IpcMainInvokeEvent, user: User): Promise<void> {
    await UserRepository.destroy({ where: { id: user.id } })
  }
}
