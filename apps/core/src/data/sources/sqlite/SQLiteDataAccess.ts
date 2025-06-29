import { Model, ModelCtor } from "sequelize-typescript"
import { IDataAccess } from "../../contracts/IDataAccess"

export class SQLiteDataAccess<T extends object = any>
  implements IDataAccess<T>
{
  protected model: ModelCtor<Model<any, any>>

  constructor(model: ModelCtor<Model<any, any>>) {
    this.model = model
  }
  async get(): Promise<T[]> {
    return window.ipc.invoke("sqlite:get", this.model.name) as Promise<T[]>
  }

  async getById(id: string): Promise<T | null> {
    return window.ipc.invoke(
      "sqlite:getById",
      this.model.name,
      id
    ) as Promise<T | null>
  }

  async create(item: T): Promise<void> {
    ;(await window.ipc.invoke(
      "sqlite:create",
      this.model.name,
      item
    )) as Promise<void>
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    ;(await window.ipc.invoke(
      "sqlite:update",
      this.model.name,
      id,
      updates
    )) as Promise<void>
  }

  async delete(id: string): Promise<void> {
    ;(await window.ipc.invoke(
      "sqlite:delete",
      this.model.name,
      id
    )) as Promise<void>
  }

  async paginate(offset: number, limit: number): Promise<T[]> {
    return window.ipc.invoke(
      "sqlite:paginate",
      this.model.name,
      offset,
      limit
    ) as Promise<T[]>
  }
}
