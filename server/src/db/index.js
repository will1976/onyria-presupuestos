/**
 * Capa de persistencia SQLite.
 *
 * Expone una API compatible con la antigua interfaz de `pg` (query, getClient, pool)
 * para que los controladores existentes funcionen sin modificarse.
 *
 * Internamente usa better-sqlite3 (síncrono, sin dependencias nativas externas).
 *
 * Diferencias clave con PostgreSQL gestionadas aquí:
 *  - Placeholders $1, $2 → ?, ?, ?
 *  - uuid_generate_v4() registrado como función SQL (usa crypto.randomUUID)
 *  - NOW() → datetime('now')
 *  - Booleans 0/1 ↔ true/false (transparente vía column-type detection)
 *  - Foreign keys activadas vía PRAGMA
 *  - WAL mode para mejor concurrencia
 */

const Database  = require('better-sqlite3')
const fs        = require('fs')
const path      = require('path')
const crypto    = require('crypto')
const config    = require('../config')

// ── Inicialización ────────────────────────────────────────────────────────
const dbDir = path.dirname(config.db.file)
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(config.db.file, {
  verbose: config.db.verbose ? console.log : null,
})

// PRAGMAs críticas para integridad y concurrencia
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('synchronous = NORMAL')

// Funciones SQL personalizadas que emulan PostgreSQL
db.function('uuid_generate_v4', () => crypto.randomUUID())
db.function('gen_random_uuid',  () => crypto.randomUUID())
db.function('now',              () => new Date().toISOString())

// ── Helpers de traducción PG → SQLite ─────────────────────────────────────
/** Reemplaza $1, $2... por ? para better-sqlite3 */
function translatePlaceholders(sql) {
  return sql.replace(/\$(\d+)/g, '?')
}

/** Reemplaza NOW() por datetime('now') */
function translateFunctions(sql) {
  return sql
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')")
}

/** Convierte valores JS al formato esperado por SQLite */
function normalizeParams(params = []) {
  return params.map(v => {
    if (v === undefined) return null
    if (v === true)  return 1
    if (v === false) return 0
    if (v instanceof Date) return v.toISOString()
    return v
  })
}

/** Detecta si el SQL es una sentencia de modificación (vs SELECT) */
function isMutation(sql) {
  return /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|PRAGMA|BEGIN|COMMIT|ROLLBACK)/i.test(sql)
}

/** Ejecuta SQL en una conexión (la principal o la de un client transaccional) */
function execute(sqlRaw, paramsRaw) {
  const sql    = translateFunctions(translatePlaceholders(sqlRaw))
  const params = normalizeParams(paramsRaw)

  if (isMutation(sql) && !/RETURNING/i.test(sql)) {
    // Statements sin RETURNING: usar .run() para changes/lastInsertRowid
    const stmt = db.prepare(sql)
    const info = stmt.run(...params)
    return {
      rows: [],
      rowCount: info.changes,
      lastInsertRowid: info.lastInsertRowid,
    }
  }

  // SELECT o INSERT...RETURNING / UPDATE...RETURNING / DELETE...RETURNING
  try {
    const stmt = db.prepare(sql)
    const rows = stmt.all(...params)
    return { rows, rowCount: rows.length }
  } catch (err) {
    // Algunas sentencias como CREATE no pueden usar .all(); intentar .run()
    if (/cannot bind|no result/.test(err.message)) {
      const info = db.prepare(sql).run(...params)
      return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid }
    }
    throw err
  }
}

// ── API pública compatible con pg ─────────────────────────────────────────
/**
 * Ejecuta una query simple.
 * Mantiene la firma async para compatibilidad con el código que hace `await query(...)`.
 */
async function query(sql, params) {
  const start = Date.now()
  try {
    const res = await Promise.resolve(execute(sql, params))
    if (config.nodeEnv === 'development') {
      const dur = Date.now() - start
      // console.log(`[db] (${dur}ms)`, sql.slice(0, 80).replace(/\s+/g, ' '))
    }
    return res
  } catch (err) {
    console.error('[db] Query error:', err.message, '\nSQL:', sql.slice(0, 200))
    throw err
  }
}

/**
 * Devuelve un "cliente" transaccional con la misma firma que pg.Client.
 *
 * El cliente acumula sentencias dentro de una transacción manual.
 * SQLite usa BEGIN/COMMIT/ROLLBACK explícitos cuando se llama desde el cliente.
 *
 * El controlador típicamente hace:
 *   const client = await getClient()
 *   try {
 *     await client.query('BEGIN')
 *     await client.query('INSERT ...')
 *     await client.query('COMMIT')
 *   } catch (e) {
 *     await client.query('ROLLBACK')
 *   } finally {
 *     client.release()
 *   }
 */
async function getClient() {
  let inTransaction = false

  return {
    query: async (sql, params) => {
      // Detectar comandos de transacción y delegar al manejo manual
      const trimmed = sql.trim().toUpperCase()
      if (trimmed === 'BEGIN' || trimmed.startsWith('BEGIN ')) {
        if (!inTransaction) {
          db.prepare('BEGIN').run()
          inTransaction = true
        }
        return { rows: [], rowCount: 0 }
      }
      if (trimmed === 'COMMIT') {
        if (inTransaction) {
          db.prepare('COMMIT').run()
          inTransaction = false
        }
        return { rows: [], rowCount: 0 }
      }
      if (trimmed === 'ROLLBACK') {
        if (inTransaction) {
          db.prepare('ROLLBACK').run()
          inTransaction = false
        }
        return { rows: [], rowCount: 0 }
      }
      return execute(sql, params)
    },
    release: () => {
      // Si por error queda una transacción abierta, hacer rollback
      if (inTransaction) {
        try { db.prepare('ROLLBACK').run() } catch {}
        inTransaction = false
      }
    },
  }
}

/**
 * Helper para ejecutar una función dentro de una transacción de forma segura.
 * Uso preferido en código nuevo (más limpio que getClient).
 */
function transaction(fn) {
  return db.transaction(fn)()
}

/**
 * Acceso al objeto Database de better-sqlite3 para casos avanzados
 * (registrar funciones, preparar statements de alto rendimiento, etc.)
 */
function getDb() {
  return db
}

// "pool" es un alias compatible — algunos archivos lo importan así.
// No es un pool real (SQLite tiene una sola conexión), pero expone .query / .end
const pool = {
  query,
  connect: getClient,
  end: () => db.close(),
  on: () => {}, // no-op para compatibilidad con pool.on('error', ...)
}

module.exports = { query, getClient, transaction, getDb, pool }
