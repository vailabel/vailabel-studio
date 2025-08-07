import { User } from "@vailabel/core"
import { IpcHandler } from "apps/desktop/src/interface/IpcHandler"
import { UserRepository } from "../../db/models"
import bcrypt from "bcrypt"
export class SaveUserCommand implements IpcHandler<User, void> {
  channel = "save:users"

  async handle(_event: Electron.IpcMainInvokeEvent, user: User): Promise<void> {
    await UserRepository.create({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      password: this.hash(user.password),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  }
  private hash(password: string): string {
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(password, salt)
  }
}
