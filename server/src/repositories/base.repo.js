/**
 * BaseRepository
 *
 * Patrón Repository minimalista para SQLite. Cada subclase declara su
 * tabla y campos JSON, y obtiene gratis los métodos CRUD básicos con
 * manejo de:
 *   - boolean → integer (en columnas declaradas como booleanas)
 *   - integer → boolean (al leer)
 *   - JSON serializado en columnas declaradas como `jsonFields`
 *   - timestamps automáticos en updated_at
 *
 * Pensado para extenderse con queries específicas por dominio.
 */

const { getDb, transaction } = require('../db')

class BaseRepository {
  /**
   * @param {object} opts
   * @param {string} opts.table              Nombre de la tabla
   * @param {string[]} [opts.booleanFields]  Columnas que deben convertirse a/desde boolean
   * @param {string[]} [opts.jsonFields]     Columnas que se serializan/deserializan como JSON
   * @param {boolean}  [opts.timestamps]     Si la tabla tiene updated_at automático (default true)
   */
  constructor({ table, booleanFields = [], jsonFields = [], timestamps = true }) {
    this.db            = getDb()
    this.table         = table
    this.booleanFields = new Set(booleanFields)
    this.jsonFields    = new Set(jsonFields)
    this.timestamps    = timestamps
  }

  // ── Mapeo de tipos ──────────────────────────────────────────────────────
  /** Convierte una fila de SQLite (con 0/1 y strings JSON) al modelo del dominio */
  rowToModel(row) {
    if (!row) return null
    const out = { ...row }
    for (const field of this.booleanFields) {
      if (field in out) out[field] = !!out[field]
    }
    for (const field of this.jsonFields) {
      if (field in out && typeof out[field] === 'string') {
        try { out[field] = JSON.parse(out[field]) }
        catch { /* dejar como string si no es JSON válido */ }
      }
    }
    return out
  }

  /** Inverso de rowToModel: convierte el modelo del dominio a la fila SQLite */
  modelToRow(model) {
    const out = {}
    for (const [key, val] of Object.entries(model)) {
      if (val === undefined) continue
      if (this.booleanFields.has(key)) out[key] = val ? 1 : 0
      else if (this.jsonFields.has(key) && val != null && typeof val !== 'string') out[key] = JSON.stringify(val)
      else if (val instanceof Date) out[key] = val.toISOString()
      else out[key] = val
    }
    return out
  }

  // ── CRUD genérico ───────────────────────────────────────────────────────
  /** Lista con filtros opcionales (igualdad simple) y ordenamiento */
  list({ where = {}, orderBy = 'created_at DESC', limit, offset = 0 } = {}) {
    const conds  = []
    const params = []
    for (const [k, v] of Object.entries(where)) {
      if (v === null) {
        conds.push(`${k} IS NULL`)
      } else {
        conds.push(`${k} = ?`)
        params.push(this.booleanFields.has(k) ? (v ? 1 : 0) : v)
      }
    }
    let sql = `SELECT * FROM ${this.table}`
    if (conds.length)  sql += ' WHERE ' + conds.join(' AND ')
    if (orderBy)       sql += ' ORDER BY ' + orderBy
    if (limit != null) sql += ' LIMIT ? OFFSET ?', params.push(limit, offset)

    const rows = this.db.prepare(sql).all(...params)
    return rows.map(r => this.rowToModel(r))
  }

  /** Cuenta filas con filtros opcionales */
  count(where = {}) {
    const conds  = []
    const params = []
    for (const [k, v] of Object.entries(where)) {
      if (v === null) {
        conds.push(`${k} IS NULL`)
      } else {
        conds.push(`${k} = ?`)
        params.push(this.booleanFields.has(k) ? (v ? 1 : 0) : v)
      }
    }
    let sql = `SELECT COUNT(*) AS c FROM ${this.table}`
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ')
    return this.db.prepare(sql).get(...params).c
  }

  /** Obtiene una fila por id */
  findById(id) {
    const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id)
    return this.rowToModel(row)
  }

  /** Obtiene la primera fila que matchee con un objeto where simple */
  findOne(where = {}) {
    const list = this.list({ where, limit: 1 })
    return list[0] || null
  }

  /** Crea una fila y devuelve la fila completa con su id generado */
  create(data) {
    const row = this.modelToRow(data)
    const cols = Object.keys(row)
    const placeholders = cols.map(() => '?').join(', ')
    const sql = `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
    const created = this.db.prepare(sql).get(...cols.map(c => row[c]))
    return this.rowToModel(created)
  }

  /** Actualiza por id. Devuelve la fila actualizada o null si no existe */
  update(id, data) {
    const row = this.modelToRow(data)
    const cols = Object.keys(row)
    if (cols.length === 0) return this.findById(id)
    const sets = cols.map(c => `${c} = ?`).join(', ')
    const updatedAt = this.timestamps ? `, updated_at = datetime('now')` : ''
    const sql = `UPDATE ${this.table} SET ${sets}${updatedAt} WHERE id = ? RETURNING *`
    const updated = this.db.prepare(sql).get(...cols.map(c => row[c]), id)
    return this.rowToModel(updated)
  }

  /** Borra por id. Devuelve true si borró algo */
  delete(id) {
    const info = this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(id)
    return info.changes > 0
  }

  /** Helper para correr operaciones del repo en una transacción */
  withTransaction(fn) {
    return transaction(fn)
  }
}

module.exports = { BaseRepository }
