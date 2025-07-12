import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { UserRepository } from "../../db/models"

export class DeleteUserCommand implements IpcHandler<string, void> {
  channel = "delete:users"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    userId: string
  ): Promise<void> {
    await UserRepository.destroy({ where: { id: userId } })
  }
}
