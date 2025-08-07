import  bcrypt  from 'bcrypt';
import { User } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { UserRepository } from "../../db/models"

export class UpdateUserCommand implements IpcHandler<User, void> {
  channel = "update:users"

  async handle(_event: Electron.IpcMainInvokeEvent, user: User): Promise<void> {
    if (user.password) {
      user.password = this.hash(user.password);
    }
    await UserRepository.update(user, { where: { id: user.id } })
  }

  private hash(password: string): string {
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(password, salt)
  }
}
