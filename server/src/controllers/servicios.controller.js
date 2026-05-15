const { query }    = require('../db')
const { csvToList } = require('../ai/utils/textNormalizer')
const { updateServiceEmbedding } = require('../ai/jobs/updateServiceEmbedding')

/**
 * Fire-and-forget: regenera el embedding del servicio en background.
 * No bloquea la respuesta HTTP. Si falla, solo se loguea (el servicio ya
 * quedó persistido OK).
 */
function refreshEmbeddingAsync(serviceId) {
  setImmediate(async () => {
    try {
      await updateServiceEmbedding(serviceId)
    } catch (err) {
      console.error('[Embedding] background update failed:', err.message)
    }
  })
}

/**
 * Helpers de mapeo de payload → fila de DB.
 * - aliases/tags se almacenan como JSON serializado (array de strings).
 * - casos_uso/no_aplica son texto libre (los normalizamos a CSV limpio sin duplicados).
 * - subcategoria es texto libre.
 */
function arrayToJson(val) {
  const list = csvToList(val)
  return list.length ? JSON.stringify(list) : null
}
function csvText(val) {
  const list = csvToList(val)
  return list.length ? list.join(', ') : null
}

// GET /api/servicios
async function listar(req, res, next) {
  try {
    const { categoria, activo, q } = req.query

    let sql    = 'SELECT * FROM servicios WHERE 1=1'
    const vals = []
    let i = 1

    if (categoria) { sql += ` AND categoria = $${i++}`;  vals.push(categoria) }
    if (activo !== undefined) { sql += ` AND activo = $${i++}`; vals.push(activo === 'true') }
    if (q) {
      // SQLite: LIKE es case-insensitive ASCII por defecto; LOWER() para acentos
      sql += ` AND (LOWER(nombre) LIKE LOWER($${i}) OR LOWER(descripcion) LIKE LOWER($${i}))`
      vals.push(`%${q}%`); i++
    }
    sql += ' ORDER BY categoria, nombre'

    const { rows } = await query(sql, vals)
    res.json({ success: true, data: rows })
  } catch (err) { next(err) }
}

// GET /api/servicios/:id
async function obtener(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM servicios WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Servicio no encontrado' })
    res.json({ success: true, data: rows[0] })
  } catch (err) { next(err) }
}

// POST /api/servicios
async function crear(req, res, next) {
  try {
    const {
      nombre, categoria, descripcion, precio_base, unidad, moneda, activo, porcentaje_boleta,
      aliases, tags, casos_uso, no_aplica, subcategoria,
    } = req.body
    if (!nombre) return res.status(400).json({ success: false, error: 'El nombre es requerido' })

    const { rows } = await query(`
      INSERT INTO servicios (
        nombre, categoria, descripcion, precio_base, unidad, moneda, activo, porcentaje_boleta,
        aliases, tags, casos_uso, no_aplica, subcategoria
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      nombre.trim(), categoria || 'otro', descripcion || null,
      parseFloat(precio_base) || 0, unidad || 'por pieza',
      moneda || 'CLP', activo !== false,
      parseFloat(porcentaje_boleta) || 0,
      arrayToJson(aliases),
      arrayToJson(tags),
      csvText(casos_uso),
      csvText(no_aplica),
      subcategoria?.trim() || null,
    ])

    // Auto-regenerar embedding del servicio recién creado (fire-and-forget)
    if (rows[0]?.id) refreshEmbeddingAsync(rows[0].id)

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) { next(err) }
}

// PUT /api/servicios/:id
async function actualizar(req, res, next) {
  try {
    const {
      nombre, categoria, descripcion, precio_base, unidad, moneda, activo, porcentaje_boleta,
      aliases, tags, casos_uso, no_aplica, subcategoria,
    } = req.body

    const { rows } = await query(`
      UPDATE servicios SET
        nombre             = COALESCE($1, nombre),
        categoria          = COALESCE($2, categoria),
        descripcion        = $3,
        precio_base        = COALESCE($4, precio_base),
        unidad             = COALESCE($5, unidad),
        moneda             = COALESCE($6, moneda),
        activo             = COALESCE($7, activo),
        porcentaje_boleta  = COALESCE($8, porcentaje_boleta),
        aliases            = $9,
        tags               = $10,
        casos_uso          = $11,
        no_aplica          = $12,
        subcategoria       = $13
      WHERE id = $14
      RETURNING *
    `, [
      nombre?.trim() || null, categoria || null, descripcion ?? null,
      precio_base != null ? parseFloat(precio_base) : null,
      unidad || null, moneda || null,
      activo != null ? activo : null,
      porcentaje_boleta != null ? parseFloat(porcentaje_boleta) : null,
      arrayToJson(aliases),
      arrayToJson(tags),
      csvText(casos_uso),
      csvText(no_aplica),
      subcategoria !== undefined ? (subcategoria?.trim() || null) : null,
      req.params.id,
    ])

    if (!rows[0]) return res.status(404).json({ success: false, error: 'Servicio no encontrado' })

    // Auto-regenerar embedding del servicio editado (fire-and-forget)
    refreshEmbeddingAsync(rows[0].id)

    res.json({ success: true, data: rows[0] })
  } catch (err) { next(err) }
}

// DELETE /api/servicios/:id
async function eliminar(req, res, next) {
  try {
    // Soft delete if used in any budget, hard delete otherwise
    const { rows: usados } = await query(
      'SELECT id FROM presupuesto_items WHERE servicio_id = $1 LIMIT 1',
      [req.params.id]
    )

    if (usados.length > 0) {
      await query('UPDATE servicios SET activo = false WHERE id = $1', [req.params.id])
      return res.json({ success: true, data: { message: 'Servicio desactivado (está siendo usado en presupuestos)' } })
    }

    const { rowCount } = await query('DELETE FROM servicios WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ success: false, error: 'Servicio no encontrado' })
    res.json({ success: true, data: { message: 'Servicio eliminado' } })
  } catch (err) { next(err) }
}

module.exports = { listar, obtener, crear, actualizar, eliminar }
