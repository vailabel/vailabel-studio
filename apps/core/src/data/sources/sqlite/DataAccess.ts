import { IDataAccess } from "../../interface/IDataAccess"
export class DataAccess<T extends object = any> implements IDataAccess<T> {
  protected table: string

  constructor(table: string) {
    this.table = table
  }

  // Generic CRUD methods
  async get<T>(): Promise<T[]> {
    const rows = window.ipc.invoke("sqlite:all", [
      `SELECT * FROM ${this.table}`,
      [],
    ])
    const parsedRows = await rows
    for (const row of parsedRows) {
      for (const [key, value] of Object.entries(row)) {
        if (this.isJson(value)) {
          try {
            row[key] = JSON.parse(value as string)
          } catch (e) {
            console.error(`Failed to parse JSON for key ${key}:`, e)
          }
        }
      }
    }
    return parsedRows
  }

  private isJson(data: any): boolean {
    return (
      typeof data === "string" && (data.startsWith("{") || data.startsWith("["))
    )
  }

  async getById<T>(id: string): Promise<T | null> {
    const row = await window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE id = ?`,
      [id],
    ])
    // if data is json, parse it
    if (row) {
      for (const [key, value] of Object.entries(row)) {
        if (this.isJson(value)) {
          try {
            row[key] = JSON.parse(value as string)
          } catch (e) {
            console.error(`Failed to parse JSON for key ${key}:`, e)
          }
        }
      }
    }
    return row || null
  }

  async create(item: T): Promise<void> {
    const flatItem: Record<string, any> = {}

    for (const [key, value] of Object.entries(item)) {
      if (
        typeof value !== "object" || // Keep primitives
        value === null || // Allow null
        value instanceof Date
      ) {
        flatItem[key] = value
      } else if (key === "coordinates") {
        flatItem[key] = JSON.stringify(value)
      }
    }

    const keys = Object.keys(flatItem)
    const values = Object.values(flatItem)
    const placeholders = keys.map(() => "?").join(", ")
    await window.ipc.invoke("sqlite:run", [
      `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${placeholders})`,
      values,
    ])
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updates)
    await window.ipc.invoke("sqlite:run", [
      `UPDATE ${this.table} SET ${setClause} WHERE id = ?`,
      [...values, id],
    ])
  }

  async delete(id: string): Promise<void> {
    await window.ipc.invoke("sqlite:run", [
      `DELETE FROM ${this.table} WHERE id = ?`,
      [id],
    ])
  }

  async paginate<T>(offset: number, limit: number): Promise<T[]> {
    return window.ipc.invoke("sqlite:all", [
      `SELECT * FROM ${this.table} LIMIT ? OFFSET ?`,
      [limit, offset],
    ])
  }
}
