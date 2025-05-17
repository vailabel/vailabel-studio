import { ipcMain } from "electron"
import fs from "fs"
import path from "path"
import { runMigrations } from "../db/sqliteDb"
import { promisify } from "util"

const dbPath = path.join(__dirname, "database.sqlite")
const sqlite3 = require("sqlite3").verbose()

const dbDir = path.dirname(dbPath)
const isNewDb = !fs.existsSync(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new sqlite3.Database(dbPath)

if (isNewDb) {
  runMigrations(db)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// IPC handler for running a query that returns a single row
ipcMain.handle(
  "sqlite:get",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      return await new Promise((resolve, reject) => {
        db.get(sql, params, (err: any, row: any) => {
          if (err) reject(err)
          else resolve(row)
        })
      })
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
      return await new Promise((resolve, reject) => {
        db.all(sql, params, (err: any, rows: any) => {
          if (err) reject(err)
          else resolve(rows)
        })
      })
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
      await new Promise((resolve, reject) => {
        db.run(sql, params, function (err: any) {
          if (err) reject(err)
          else resolve({ success: true })
        })
      })
      return { success: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  }
)
