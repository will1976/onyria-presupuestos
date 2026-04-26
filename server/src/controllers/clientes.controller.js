const { query } = require('../db')

// GET /api/clientes
async function listar(req, res, next) {
  try {
    const { q } = req.query
    let sql  = 'SELECT * FROM clientes WHERE activo = true'
    const vals = []

    if (q) {
      sql += ' AND (nombre ILIKE $1 OR empresa ILIKE $1 OR email ILIKE $1)'
      vals.push(`%${q}%`)
    }
    sql += ' ORDER BY nombre'

    const { rows } = await query(sql, vals)
    res.json({ success: true, data: rows })
  } catch (err) { next(err) }
}

// GET /api/clientes/:id
async function obtener(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM clientes WHERE id = $1 AND activo = true', [req.params.id])
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Cliente no encontrado' })
    res.json({ success: true, data: rows[0] })
  } catch (err) { next(err) }
}

// POST /api/clientes
async function crear(req, res, next) {
  try {
    const { nombre, empresa, email, telefono, notas } = req.body
    if (!nombre) return res.status(400).json({ success: false, error: 'El nombre es requerido' })

    // Verificar duplicado por email o nombre exacto
    let existente = null
    if (email) {
      const r = await query('SELECT * FROM clientes WHERE email = $1 AND activo = true', [email])
      existente = r.rows[0] || null
    }
    if (!existente) {
      const r = await query('SELECT * FROM clientes WHERE LOWER(nombre) = LOWER($1) AND activo = true', [nombre.trim()])
      existente = r.rows[0] || null
    }
    if (existente) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un cliente con ese nombre o email',
        data: existente,
      })
    }

    const { rows } = await query(`
      INSERT INTO clientes (nombre, empresa, email, telefono, notas)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nombre.trim(), empresa || null, email || null, telefono || null, notas || null])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) { next(err) }
}

// PUT /api/clientes/:id
async function actualizar(req, res, next) {
  try {
    const { nombre, empresa, email, telefono, notas } = req.body
    const { rows } = await query(`
      UPDATE clientes SET
        nombre   = COALESCE($1, nombre),
        empresa  = $2,
        email    = $3,
        telefono = $4,
        notas    = $5
      WHERE id = $6 AND activo = true
      RETURNING *
    `, [nombre?.trim() || null, empresa ?? null, email ?? null, telefono ?? null, notas ?? null, req.params.id])

    if (!rows[0]) return res.status(404).json({ success: false, error: 'Cliente no encontrado' })
    res.json({ success: true, data: rows[0] })
  } catch (err) { next(err) }
}

// DELETE /api/clientes/:id  (soft delete — marca como inactivo)
async function eliminar(req, res, next) {
  try {
    // Verificar si tiene presupuestos activos
    const { rows: prows } = await query(
      `SELECT COUNT(*) FROM presupuestos WHERE cliente_id = $1 AND estado NOT IN ('rechazado','expirado')`,
      [req.params.id]
    )
    if (parseInt(prows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'El cliente tiene presupuestos activos y no puede eliminarse. Archiva o rechaza los presupuestos primero.',
      })
    }

    const { rows } = await query(
      'UPDATE clientes SET activo = false WHERE id = $1 AND activo = true RETURNING id',
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Cliente no encontrado' })
    res.json({ success: true })
  } catch (err) { next(err) }
}

// GET /api/clientes/:id/presupuestos
async function presupuestosPorCliente(req, res, next) {
  try {
    const { rows: cliente } = await query('SELECT * FROM clientes WHERE id = $1', [req.params.id])
    if (!cliente[0]) return res.status(404).json({ success: false, error: 'Cliente no encontrado' })

    const { rows } = await query(`
      SELECT id, numero, nombre_proyecto, tipo_proyecto, moneda, total, estado,
             fecha_emision, created_at
      FROM presupuestos
      WHERE cliente_id = $1
      ORDER BY created_at DESC
    `, [req.params.id])

    res.json({ success: true, cliente: cliente[0], data: rows })
  } catch (err) { next(err) }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, presupuestosPorCliente }
