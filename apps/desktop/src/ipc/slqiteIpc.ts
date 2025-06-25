import { ipcMain, app } from "electron"
import fs from "fs"
import path from "path"

// Use Electron's userData directory for the database file
const dbPath = path.join(app.getPath("userData"), "database.sqlite")
const sqlite3 = require("sqlite3").verbose()

const dbDir = path.dirname(dbPath)
const isNewDb = !fs.existsSync(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new sqlite3.Database(dbPath)

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function dbPromise<T>(
  method: "get" | "all" | "run",
  sql: string,
  params: any[] = []
): Promise<T> {
  const methods = {
    get: (resolve: any, reject: any) =>
      db.get(sql, params, (err: any, row: any) =>
        err ? reject(err) : resolve(row)
      ),
    all: (resolve: any, reject: any) =>
      db.all(sql, params, (err: any, rows: any) =>
        err ? reject(err) : resolve(rows)
      ),
    run: (resolve: any, reject: any) =>
      db.run(sql, params, function (err: any) {
        err ? reject(err) : resolve({ success: true } as any)
      }),
  }
  return new Promise((resolve, reject) => {
    const fn = methods[method]
    if (!fn) return reject(new Error("Invalid DB method"))
    fn(resolve, reject)
  })
}

// IPC handler for running a query that returns a single row
ipcMain.handle(
  "sqlite:get",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      return await dbPromise("get", sql, params)
    } catch (error) {
      throw error
    }
  }
)

// IPC handler for running a query that returns all rows
ipcMain.handle(
  "sqlite:all",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      return await dbPromise("all", sql, params)
    } catch (error) {
      throw error
    }
  }
)

// IPC handler for running a query that modifies data (insert/update/delete)
ipcMain.handle(
  "sqlite:run",
  async (_event, [sql, params = []]: [string, any[]]) => {
    try {
      return await dbPromise("run", sql, params)
    } catch (error) {
      throw error
    }
  }
)
