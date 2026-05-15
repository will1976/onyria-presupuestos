/**
 * ServiciosRepository
 *
 * Acceso a la tabla `servicios`. Extiende BaseRepository agregando queries
 * específicas (búsqueda por nombre, listado activo, búsqueda preparada para
 * embeddings locales en el futuro).
 */

const { BaseRepository } = require('./base.repo')

class ServiciosRepository extends BaseRepository {
  constructor() {
    super({
      table: 'servicios',
      booleanFields: ['activo'],
      jsonFields:    ['aliases', 'tags', 'embedding'],
    })
  }

  /** Lista servicios activos opcionalmente filtrados por categoría */
  listarActivos({ categoria } = {}) {
    const where = { activo: true }
    if (categoria) where.categoria = categoria
    return this.list({ where, orderBy: 'nombre ASC' })
  }

  /** Búsqueda por substring en nombre/descripcion (fallback antes de embeddings) */
  buscarPorTexto(texto, { limit = 20 } = {}) {
    const q = `%${texto.toLowerCase()}%`
    const rows = this.db.prepare(`
      SELECT * FROM servicios
      WHERE activo = 1
        AND (LOWER(nombre)      LIKE ?
          OR LOWER(descripcion) LIKE ?
          OR LOWER(categoria)   LIKE ?)
      ORDER BY nombre ASC
      LIMIT ?
    `).all(q, q, q, limit)
    return rows.map(r => this.rowToModel(r))
  }

  /** Categorías únicas presentes en el catálogo */
  listarCategorias() {
    const rows = this.db.prepare(
      'SELECT DISTINCT categoria FROM servicios WHERE categoria IS NOT NULL ORDER BY categoria'
    ).all()
    return rows.map(r => r.categoria)
  }

  /**
   * Setter del embedding de un servicio.
   * El embedding se almacena como JSON serializado (array de floats).
   * Actualiza también embedding_updated_at para auditoría/rastreo.
   */
  setEmbedding(id, vector) {
    const json = vector == null ? null : JSON.stringify(vector)
    const now  = new Date().toISOString()
    this.db.prepare(`
      UPDATE servicios
         SET embedding            = ?,
             embedding_updated_at = ?,
             updated_at           = datetime('now')
       WHERE id = ?
    `).run(json, vector == null ? null : now, id)
    return now
  }

  /**
   * Devuelve todos los servicios con embedding no nulo, ya parseados.
   * Útil para la futura búsqueda por similitud (calculada en memoria).
   */
  listarConEmbedding() {
    const rows = this.db.prepare(
      'SELECT * FROM servicios WHERE activo = 1 AND embedding IS NOT NULL'
    ).all()
    return rows.map(r => this.rowToModel(r))
  }

  /** Borra todos los servicios — útil para reset/seed manual */
  truncate() {
    this.db.prepare('DELETE FROM servicios').run()
  }
}

module.exports = { ServiciosRepository, serviciosRepo: new ServiciosRepository() }
