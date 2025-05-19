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
    db.run(
      `CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, filename TEXT UNIQUE)`,
      (err) => {
        if (err) throw err
        db.all(
          `SELECT filename FROM migrations`,
          (err, rows: { filename: string }[] = []) => {
            if (err) throw err
            const appliedFiles = new Set(rows.map((r) => r.filename))
            const unapplied = migrations.filter((m) => {
              // Find the filename for this migration
              const migrationsDir = path.join(__dirname, "migrations")
              const files = fs
                .readdirSync(migrationsDir)
                .filter((f) => /^\d+_.*\.sql$/.test(f))
              const file = files.find(
                (f) => parseInt(f.split("_")[0], 10) === m.id
              )
              return file && !appliedFiles.has(file)
            })
            if (unapplied.length === 0) {
              console.log(
                `\x1b[36m[SQLite Migration]\x1b[0m All migrations already applied. (${migrations.length} total)`
              )
              return
            }
            function applyNext(index: number) {
              if (index >= unapplied.length) {
                console.log(
                  `\x1b[36m[SQLite Migration]\x1b[0m All migrations complete. (${unapplied.length} applied, ${migrations.length} total)`
                )
                return
              }
              const migration = unapplied[index]
              // Find the filename for this migration
              const migrationsDir = path.join(__dirname, "migrations")
              const files = fs
                .readdirSync(migrationsDir)
                .filter((f) => /^\d+_.*\.sql$/.test(f))
              const file = files.find(
                (f) => parseInt(f.split("_")[0], 10) === migration.id
              )
              if (!file) {
                console.error(
                  `Migration file not found for id #${migration.id}`
                )
                applyNext(index + 1)
                return
              }
              const statements = migration.sql
                .split(/;\s*(?:\n|$)/)
                .map((stmt) => stmt.trim())
                .filter((stmt) => stmt.length > 0)
              db.run("BEGIN TRANSACTION")
              function runStatements(i: number) {
                if (i >= statements.length) {
                  db.run(
                    `INSERT INTO migrations (id, filename) VALUES (?, ?)`,
                    [migration.id, file],
                    (err) => {
                      if (err) {
                        db.run("ROLLBACK")
                        console.error(
                          `Failed to record migration #${migration.id}:`,
                          err
                        )
                        applyNext(index + 1)
                      } else {
                        db.run("COMMIT")
                        console.log(
                          `\x1b[32m[SQLite Migration]\x1b[0m Applied migration #${migration.id} (${file})`
                        )
                        applyNext(index + 1)
                      }
                    }
                  )
                  return
                }
                db.run(statements[i], (err) => {
                  if (err) {
                    db.run("ROLLBACK")
                    console.error(
                      `\x1b[31m[SQLite Migration]\x1b[0m Error in migration #${migration.id}, statement:`,
                      statements[i],
                      "\n",
                      err
                    )
                    applyNext(index + 1)
                    return
                  }
                  runStatements(i + 1)
                })
              }
              runStatements(0)
            }
            applyNext(0)
          }
        )
      }
    )
  })
}
