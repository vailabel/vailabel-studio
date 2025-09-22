import { sequelize } from "./sequelize"
import { UserRepository } from "./models"
import { app } from "electron"
import * as bcrypt from "bcrypt"

export async function initDatabase() {
  console.log("Initializing database...")
  try {
    await sequelize.sync({ force: false })
    console.log("Database synchronized successfully.")
    
    // Create default admin user if none exists
    await createDefaultAdminUser()
    console.log("Database initialization completed successfully")
  } catch (err) {
    console.error("Failed to synchronize database:", err)
    app.quit()
    throw err
  }
}

async function createDefaultAdminUser() {
  console.log("Checking for default admin user...")
  try {
    const existingAdmin = await UserRepository.findOne({
      where: { email: "admin@vailabel.com" }
    })

    if (!existingAdmin) {
      console.log("Creating default admin user...")
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash("admin123", saltRounds)
      
      await UserRepository.create({
        id: "admin-1",
        name: "Administrator",
        email: "admin@vailabel.com",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      console.log("Default admin user created: admin@vailabel.com / admin123")
    } else {
      console.log("Default admin user already exists")
    }
  } catch (error) {
    console.error("Failed to create default admin user:", error)
  }
}
