import { Database } from "sqlite3"
import fs from "fs"
import path from "path"

export interface Migration {
  id: number
  sql: string
}

// Dynamically load all .sql migration files from the migrations folder
export function getMigrations(): Migration[] {
  const migrationsDir = path.join(__dirname, "migrations")
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => {
      const aId = parseInt(a.split("_")[0], 10)
      const bId = parseInt(b.split("_")[0], 10)
      return aId - bId
    })
  return files.map((file) => {
    const id = parseInt(file.split("_")[0], 10)
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8")
    return { id, sql }
  })
}

export function runMigrations(db: Database) {
  const migrations = getMigrations()
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY)`)
    db.all(`SELECT id FROM migrations`, (err, rows: { id: number }[] = []) => {
      if (err) throw err
      const applied = new Set(rows.map((r) => r.id))
      let appliedCount = 0
      for (const migration of migrations) {
        if (!applied.has(migration.id)) {
          // Split SQL by semicolon at the end of a line and run each statement
          migration.sql.split(/;\s*\n/).forEach((stmt) => {
            if (stmt && stmt.trim().length > 0) {
              db.run(stmt.trim())
            }
          })
          db.run(`INSERT INTO migrations (id) VALUES (?)`, migration.id)
          // Green color
          console.log(
            `\x1b[32m[SQLite Migration]\x1b[0m Applied migration #${migration.id}`
          )
          appliedCount++
        } else {
          // Yellow color
          console.log(
            `\x1b[33m[SQLite Migration]\x1b[0m Skipped migration #${migration.id}`
          )
        }
      }
      // Cyan color
      console.log(
        `\x1b[36m[SQLite Migration]\x1b[0m All migrations complete. (${appliedCount} applied, ${migrations.length} total)`
      )
    })
  })
}
