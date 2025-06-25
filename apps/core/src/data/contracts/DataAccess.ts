import { Model, ModelCtor } from "sequelize-typescript"
import { IDataAccess } from "./IDataAccess"

export class DataAccess<T extends object = any> implements IDataAccess<T> {
  protected model: ModelCtor<Model<any, any>>

  constructor(model: ModelCtor<Model<any, any>>) {
    this.model = model
  }

  // Generic CRUD methods
  async get(): Promise<T[]> {
    return (await this.model.findAll()) as T[]
  }

  async getById(id: string): Promise<T | null> {
    return (await this.model.findByPk(id)) as T | null
  }

  async create(item: T): Promise<void> {
    await this.model.create(item as any)
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    await this.model.update(updates, { where: { id } })
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({ where: { id } })
  }

  async paginate(offset: number, limit: number): Promise<T[]> {
    return (await this.model.findAll({ offset, limit })) as T[]
  }
}
