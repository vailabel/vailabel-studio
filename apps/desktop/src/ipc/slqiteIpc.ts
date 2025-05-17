import { runMigrations } from "@vailabel/core/src/data/db/sqliteDb"
import { SQLiteDataAccess } from "@vailabel/core/src/data/sources/sqlite/SQLiteDataAccess"
import { ipcMain } from "electron"
import path from "path"

const dbPath = path.join(__dirname, "database.sqlite")
const sqlite3 = require("sqlite3").verbose()
const dbInstance = new sqlite3.Database(dbPath)

runMigrations(dbInstance)
const db = new SQLiteDataAccess(dbPath)

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// IPC handler for running a query that returns a single row
ipcMain.handle(
  "sqlite:get",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      return await (db as any).getAsync(sql, params)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }
)

// IPC handler for running a query that returns all rows
ipcMain.handle(
  "sqlite:all",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      return await (db as any).allAsync(sql, params)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }
)

// IPC handler for running a query that modifies data (insert/update/delete)
ipcMain.handle(
  "sqlite:run",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      await (db as any).runAsync(sql, params)
      return { success: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }
)
