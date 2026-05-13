/**
 * ClientesRepository
 */

const { BaseRepository } = require('./base.repo')

class ClientesRepository extends BaseRepository {
  constructor() {
    super({
      table: 'clientes',
      booleanFields: ['activo'],
    })
  }

  /** Lista de clientes activos ordenados alfabéticamente */
  listarActivos() {
    return this.list({ where: { activo: true }, orderBy: 'nombre ASC' })
  }

  /** Busca un cliente por email (case-insensitive) entre los activos */
  findByEmail(email) {
    if (!email) return null
    const row = this.db.prepare(
      'SELECT * FROM clientes WHERE LOWER(email) = LOWER(?) AND activo = 1 LIMIT 1'
    ).get(email)
    return this.rowToModel(row)
  }

  /** Busca un cliente por nombre exacto (case-insensitive) entre los activos */
  findByNombre(nombre) {
    if (!nombre) return null
    const row = this.db.prepare(
      'SELECT * FROM clientes WHERE LOWER(nombre) = LOWER(?) AND activo = 1 LIMIT 1'
    ).get(nombre)
    return this.rowToModel(row)
  }

  /** Soft delete: marca activo = 0 */
  desactivar(id) {
    return this.update(id, { activo: false })
  }
}

module.exports = { ClientesRepository, clientesRepo: new ClientesRepository() }
