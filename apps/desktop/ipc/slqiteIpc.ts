import { ipcMain } from "electron"
import path from "path"
import { SQLiteDataAccess } from "@vai/core/data/sources/sqlite/SQLiteDataAccess"
// Path to your SQLite database file
const dbPath = path.join(__dirname, "database.sqlite")
const db = new SQLiteDataAccess(dbPath)

// IPC handler for running a query that returns a single row
ipcMain.handle("sqlite:get", async (_event, sql: string, params?: any[]) => {
  try {
    // Use the generic getAsync method
    return await (db as any).getAsync(sql, params)
  } catch (error) {
    return { error: error.message }
  }
})

// IPC handler for running a query that returns all rows
ipcMain.handle("sqlite:all", async (_event, sql: string, params?: any[]) => {
  try {
    // Use the generic allAsync method
    return await (db as any).allAsync(sql, params)
  } catch (error) {
    return { error: error.message }
  }
})

// IPC handler for running a query that modifies data (insert/update/delete)
ipcMain.handle("sqlite:run", async (_event, sql: string, params?: any[]) => {
  try {
    // Use the generic runAsync method
    await (db as any).runAsync(sql, params)
    return { success: true }
  } catch (error) {
    return { error: error.message }
  }
})
