import { sequelize } from "./sequelize"
import { app } from "electron"

export async function initDatabase() {
  try {
    await sequelize.sync()
    console.log("Database synchronized successfully.")
  } catch (err) {
    console.error("Failed to synchronize database:", err)
    app.quit()
    throw err
  }
}
