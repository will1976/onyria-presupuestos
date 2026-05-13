/**
 * PresupuestosRepository
 *
 * Maneja la tabla `presupuestos` y la coordinación con `presupuesto_items`
 * (los ítems son hijos del presupuesto y se persisten en la misma transacción).
 */

const { BaseRepository } = require('./base.repo')

class PresupuestosRepository extends BaseRepository {
  constructor() {
    super({ table: 'presupuestos' })
  }

  // ── Items hijos ─────────────────────────────────────────────────────────
  /** Lista ítems de un presupuesto en orden */
  getItems(presupuestoId) {
    const rows = this.db.prepare(
      'SELECT * FROM presupuesto_items WHERE presupuesto_id = ? ORDER BY orden ASC, created_at ASC'
    ).all(presupuestoId)
    return rows
  }

  /** Borra todos los ítems de un presupuesto (usado al actualizar) */
  deleteItems(presupuestoId) {
    this.db.prepare('DELETE FROM presupuesto_items WHERE presupuesto_id = ?').run(presupuestoId)
  }

  /** Inserta una lista de ítems para un presupuesto */
  insertItems(presupuestoId, items = []) {
    if (!items.length) return
    const stmt = this.db.prepare(`
      INSERT INTO presupuesto_items
        (presupuesto_id, servicio_id, descripcion_personalizada, categoria,
         cantidad, precio_unitario, subtotal, porcentaje_boleta, notas, fragmento_cliente, orden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    items.forEach((item, idx) => {
      stmt.run(
        presupuestoId,
        item.servicio_id || null,
        item.descripcion_personalizada || item.descripcion || null,
        item.categoria || null,
        Number(item.cantidad) || 1,
        Number(item.precio_unitario) || 0,
        Number(item.subtotal) || 0,
        Number(item.porcentaje_boleta) || 0,
        item.notas || null,
        item.fragmento_cliente || null,
        idx,
      )
    })
  }

  // ── Queries de dominio ─────────────────────────────────────────────────
  /** Obtiene un presupuesto con todos sus ítems (operación read-only típica) */
  obtenerCompleto(id) {
    const presup = this.findById(id)
    if (!presup) return null
    presup.items = this.getItems(id)
    return presup
  }

  /**
   * Crea presupuesto + ítems en una sola transacción.
   * Devuelve el presupuesto completo (con items embebidos).
   */
  crearConItems({ presupuesto, items = [] }) {
    return this.withTransaction(() => {
      const created = this.create(presupuesto)
      this.insertItems(created.id, items)
      return this.obtenerCompleto(created.id)
    })
  }

  /**
   * Actualiza presupuesto + reemplaza ítems en una transacción.
   * Si items es null/undefined, no toca los ítems.
   */
  actualizarConItems(id, { presupuesto, items }) {
    return this.withTransaction(() => {
      this.update(id, presupuesto)
      if (Array.isArray(items)) {
        this.deleteItems(id)
        this.insertItems(id, items)
      }
      return this.obtenerCompleto(id)
    })
  }

  /** Lista paginada con join a cliente */
  listar({ estado, limit = 50, offset = 0, order = 'desc' } = {}) {
    const conds  = []
    const params = []
    if (estado) { conds.push('p.estado = ?'); params.push(estado) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const dir = order === 'asc' ? 'ASC' : 'DESC'

    const sql = `
      SELECT p.*, c.nombre AS cliente FROM presupuestos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      ${where}
      ORDER BY p.created_at ${dir}
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)
    return this.db.prepare(sql).all(...params)
  }

  /** Métricas globales para el dashboard */
  metricas() {
    const totalMes = this.db.prepare(`
      SELECT COUNT(*) AS c FROM presupuestos
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get().c

    const sumas = this.db.prepare(`
      SELECT
        SUM(CASE WHEN moneda = 'CLP' THEN total ELSE 0 END) AS total_clp,
        SUM(CASE WHEN moneda = 'USD' THEN total ELSE 0 END) AS total_usd
      FROM presupuestos
    `).get()

    const porEstado = Object.fromEntries(
      this.db.prepare('SELECT estado, COUNT(*) AS c FROM presupuestos GROUP BY estado')
        .all().map(r => [r.estado, r.c])
    )

    return {
      total_mes:    totalMes,
      total_clp:    sumas.total_clp || 0,
      total_usd:    sumas.total_usd || 0,
      aceptados:    porEstado.aceptado  || 0,
      rechazados:   porEstado.rechazado || 0,
      pendientes:   (porEstado.borrador || 0) + (porEstado.enviado || 0),
      por_estado:   {
        borrador:  porEstado.borrador  || 0,
        enviado:   porEstado.enviado   || 0,
        aceptado:  porEstado.aceptado  || 0,
        rechazado: porEstado.rechazado || 0,
        expirado:  porEstado.expirado  || 0,
      },
      chart: [], // TODO: serie temporal de últimos 6 meses
    }
  }
}

module.exports = { PresupuestosRepository, presupuestosRepo: new PresupuestosRepository() }
