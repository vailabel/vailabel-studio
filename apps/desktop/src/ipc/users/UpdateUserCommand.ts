import { User } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { UserRepository } from "../../db/models"

export class UpdateUserCommand implements IpcHandler<User, void> {
  channel = "update:users"

  async handle(_event: Electron.IpcMainInvokeEvent, user: User): Promise<void> {
    await UserRepository.update(user, { where: { id: user.id } })
  }
}
