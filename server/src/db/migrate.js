/**
 * Runner de migraciones SQLite.
 *
 * Cada archivo en migrations-sqlite/ se ejecuta en orden alfabético.
 * Se registra cada migración aplicada en la tabla `_migrations` para no
 * volver a correrla. Idempotente: las sentencias internas usan IF NOT EXISTS
 * o WHERE NOT EXISTS donde corresponde, por lo que es seguro re-ejecutar.
 */

require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const { getDb } = require('./index')

const MIGRATIONS_DIR = path.join(__dirname, 'migrations-sqlite')

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function getAppliedMigrations(db) {
  return new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name))
}

function migrate() {
  console.log('Running SQLite migrations...')
  const db = getDb()

  ensureMigrationsTable(db)
  const applied = getAppliedMigrations(db)

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn('No migrations directory found:', MIGRATIONS_DIR)
    return
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  let runCount = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  - ${file} (ya aplicada)`)
      continue
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    console.log(`  ► ${file}`)
    try {
      db.exec('BEGIN')
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
      db.exec('COMMIT')
      console.log(`    ✓ aplicada`)
      runCount++
    } catch (err) {
      db.exec('ROLLBACK')
      console.error(`    ✗ falló: ${err.message}`)
    }
  }

  console.log(`Migraciones completadas (${runCount} nuevas, ${files.length} totales)`)
}

// Ejecutar si se invoca directamente: node src/db/migrate.js
if (require.main === module) {
  migrate()
  process.exit(0)
}

module.exports = { migrate }
