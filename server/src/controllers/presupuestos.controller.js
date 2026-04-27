const { query, getClient } = require('../db')
const { generarPDF }       = require('../utils/pdfGenerator')

// ── helpers ────────────────────────────────────────────────────────────────
function generateNumero() {
  const year = new Date().getFullYear()
  const rand = String(Math.floor(Math.random() * 900) + 100)
  return `ONY-${year}-${rand}`
}

async function getPresupuestoCompleto(id) {
  const { rows: [p] } = await query(`
    SELECT
      p.*,
      u.nombre AS creado_por_nombre
    FROM presupuestos p
    LEFT JOIN usuarios u ON u.id = p.creado_por
    WHERE p.id = $1
  `, [id])
  if (!p) return null

  const { rows: items } = await query(`
    SELECT pi.*, s.nombre AS servicio_nombre
    FROM presupuesto_items pi
    LEFT JOIN servicios s ON s.id = pi.servicio_id
    WHERE pi.presupuesto_id = $1
    ORDER BY pi.orden, pi.id
  `, [id])

  return { ...p, items }
}

// ── GET /api/presupuestos ──────────────────────────────────────────────────
async function listar(req, res, next) {
  try {
    const { estado, moneda, desde, hasta, categoria, limit = 50, offset = 0, order = 'desc' } = req.query

    let sql    = `
      SELECT
        p.id, p.numero, p.nombre_proyecto, p.tipo_proyecto,
        p.cliente_nombre, p.cliente_empresa,
        p.moneda, p.subtotal, p.descuento, p.impuesto, p.total,
        p.estado, p.fecha_emision, p.created_at,
        u.nombre AS creado_por_nombre
      FROM presupuestos p
      LEFT JOIN usuarios u ON u.id = p.creado_por
      WHERE 1=1
    `
    const vals = []
    let i = 1

    if (estado)    { sql += ` AND p.estado = $${i++}`;       vals.push(estado) }
    if (moneda)    { sql += ` AND p.moneda = $${i++}`;       vals.push(moneda) }
    if (categoria) { sql += ` AND p.tipo_proyecto = $${i++}`;vals.push(categoria) }
    if (desde)     { sql += ` AND p.fecha_emision >= $${i++}`;vals.push(desde) }
    if (hasta)     { sql += ` AND p.fecha_emision <= $${i++}`;vals.push(hasta) }

    const dir = order === 'asc' ? 'ASC' : 'DESC'
    sql += ` ORDER BY p.created_at ${dir} LIMIT $${i++} OFFSET $${i++}`
    vals.push(parseInt(limit), parseInt(offset))

    const { rows } = await query(sql, vals)
    res.json({ success: true, data: rows })
  } catch (err) { next(err) }
}

// ── GET /api/presupuestos/metricas ─────────────────────────────────────────
async function metricas(req, res, next) {
  try {
    // Counts by estado
    const { rows: estados } = await query(`
      SELECT estado, COUNT(*) AS count
      FROM presupuestos
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      GROUP BY estado
    `)

    // Totals CLP / USD this month
    const { rows: totales } = await query(`
      SELECT
        moneda,
        SUM(total) AS total_suma
      FROM presupuestos
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      GROUP BY moneda
    `)

    // Last 6 months CLP
    const { rows: chart } = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS mes,
        SUM(CASE WHEN moneda = 'CLP' THEN total ELSE 0 END) AS total
      FROM presupuestos
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `)

    const porEstado = {}
    let totalMes = 0
    for (const row of estados) {
      porEstado[row.estado] = parseInt(row.count)
      totalMes += parseInt(row.count)
    }

    const totalCLP = totales.find(r => r.moneda === 'CLP')?.total_suma || 0
    const totalUSD = totales.find(r => r.moneda === 'USD')?.total_suma || 0

    res.json({
      success: true,
      data: {
        total_mes:  totalMes,
        total_clp:  parseFloat(totalCLP),
        total_usd:  parseFloat(totalUSD),
        aceptados:  porEstado.aceptado  || 0,
        rechazados: porEstado.rechazado || 0,
        pendientes: porEstado.enviado   || 0,
        por_estado: porEstado,
        chart:      chart.map(r => ({ mes: r.mes, total: parseFloat(r.total) })),
      },
    })
  } catch (err) { next(err) }
}

// ── GET /api/presupuestos/:id ──────────────────────────────────────────────
async function obtener(req, res, next) {
  try {
    const p = await getPresupuestoCompleto(req.params.id)
    if (!p) return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' })
    res.json({ success: true, data: p })
  } catch (err) { next(err) }
}

// ── POST /api/presupuestos ─────────────────────────────────────────────────
async function crear(req, res, next) {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    const {
      cliente, empresa, email_cliente, telefono,
      cliente_id,
      nombre_proyecto, tipo_proyecto,
      moneda = 'CLP', subtotal = 0, descuento = 0, impuesto = 0, total = 0,
      ajuste_total, ajuste_motivo,
      estado = 'borrador', validez = 30,
      fecha, notas, condiciones,
      items = [],
    } = req.body

    if (!nombre_proyecto) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, error: 'El nombre del proyecto es requerido' })
    }

    // Resolve cliente_id: use provided id, or search by email/name
    let clienteId = cliente_id || null
    if (!clienteId && cliente) {
      let found = null
      if (email_cliente) {
        const r = await client.query('SELECT id FROM clientes WHERE email = $1 AND activo = true', [email_cliente])
        found = r.rows[0] || null
      }
      if (!found) {
        const r = await client.query('SELECT id FROM clientes WHERE nombre ILIKE $1 AND activo = true LIMIT 1', [cliente])
        found = r.rows[0] || null
      }
      clienteId = found?.id || null
    }

    // Ensure unique numero (always verify, even if frontend sends one)
    let numero = req.body.numero
    if (numero) {
      const exists = await client.query('SELECT id FROM presupuestos WHERE numero = $1', [numero])
      if (exists.rows.length > 0) numero = null  // conflict → generate new
    }
    if (!numero) {
      let unique = false
      while (!unique) {
        numero = generateNumero()
        const exists = await client.query('SELECT id FROM presupuestos WHERE numero = $1', [numero])
        unique = exists.rows.length === 0
      }
    }

    const { rows: [pres] } = await client.query(`
      INSERT INTO presupuestos (
        numero, cliente_id, cliente_nombre, cliente_empresa, cliente_email, cliente_telefono,
        nombre_proyecto, tipo_proyecto, moneda, subtotal, descuento, impuesto, total,
        ajuste_total, ajuste_motivo,
        estado, validez_dias, fecha_emision, notas, condiciones, creado_por
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
    `, [
      numero, clienteId, cliente || null, empresa || null, email_cliente || null, telefono || null,
      nombre_proyecto, tipo_proyecto || null,
      moneda, parseFloat(subtotal), parseFloat(descuento), parseFloat(impuesto), parseFloat(total),
      ajuste_total != null ? parseFloat(ajuste_total) : null,
      ajuste_motivo || null,
      estado, parseInt(validez) || 30, fecha || new Date().toISOString().split('T')[0], notas || null, condiciones || null,
      null,
    ])

    // Insert items
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      await client.query(`
        INSERT INTO presupuesto_items
          (presupuesto_id, servicio_id, descripcion_personalizada, categoria, cantidad, precio_unitario, subtotal, notas, fragmento_cliente, orden)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        pres.id,
        item.servicio_id || null,
        item.descripcion_personalizada || item.descripcion || null,
        item.categoria || null,
        parseFloat(item.cantidad) || 1,
        parseFloat(item.precio_unitario) || 0,
        parseFloat(item.subtotal) || 0,
        item.notas || null,
        item.fragmento_cliente || null,
        idx,
      ])
    }

    await client.query('COMMIT')
    const full = await getPresupuestoCompleto(pres.id)
    res.status(201).json({ success: true, data: full })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// ── PUT /api/presupuestos/:id ──────────────────────────────────────────────
async function actualizar(req, res, next) {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    const {
      cliente, empresa, email_cliente, telefono,
      cliente_id,
      nombre_proyecto, tipo_proyecto, moneda, subtotal, descuento, impuesto, total,
      ajuste_total, ajuste_motivo,
      validez, fecha, notas, condiciones, estado,
      items = [],
    } = req.body

    // Resolve cliente_id: use provided id, or search by email/name
    let clienteId = cliente_id || null
    if (!clienteId && cliente) {
      let found = null
      if (email_cliente) {
        const r = await client.query('SELECT id FROM clientes WHERE email = $1 AND activo = true', [email_cliente])
        found = r.rows[0] || null
      }
      if (!found) {
        const r = await client.query('SELECT id FROM clientes WHERE nombre ILIKE $1 AND activo = true LIMIT 1', [cliente])
        found = r.rows[0] || null
      }
      clienteId = found?.id || null
    }

    await client.query(`
      UPDATE presupuestos SET
        cliente_id       = COALESCE($1,  cliente_id),
        cliente_nombre   = COALESCE($2,  cliente_nombre),
        cliente_empresa  = $3,
        cliente_email    = $4,
        cliente_telefono = $5,
        nombre_proyecto  = COALESCE($6,  nombre_proyecto),
        tipo_proyecto    = COALESCE($7,  tipo_proyecto),
        moneda           = COALESCE($8,  moneda),
        subtotal         = COALESCE($9,  subtotal),
        descuento        = COALESCE($10, descuento),
        impuesto         = COALESCE($11, impuesto),
        total            = COALESCE($12, total),
        ajuste_total     = $13,
        ajuste_motivo    = $14,
        estado           = COALESCE($15, estado),
        validez_dias     = COALESCE($16, validez_dias),
        fecha_emision    = COALESCE($17, fecha_emision),
        notas            = $18,
        condiciones      = $19
      WHERE id = $20
    `, [
      clienteId,
      cliente || null, empresa ?? null, email_cliente ?? null, telefono ?? null,
      nombre_proyecto || null, tipo_proyecto || null, moneda || null,
      subtotal != null ? parseFloat(subtotal) : null,
      descuento != null ? parseFloat(descuento) : null,
      impuesto != null ? parseFloat(impuesto) : null,
      total != null ? parseFloat(total) : null,
      ajuste_total != null ? parseFloat(ajuste_total) : null,
      ajuste_motivo || null,
      estado || null, validez ? parseInt(validez) : null, fecha || null,
      notas ?? null, condiciones ?? null,
      req.params.id,
    ])

    if (items.length > 0) {
      await client.query('DELETE FROM presupuesto_items WHERE presupuesto_id = $1', [req.params.id])
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        await client.query(`
          INSERT INTO presupuesto_items
            (presupuesto_id, servicio_id, descripcion_personalizada, categoria, cantidad, precio_unitario, subtotal, notas, fragmento_cliente, orden)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `, [
          req.params.id, item.servicio_id || null,
          item.descripcion_personalizada || item.descripcion || null,
          item.categoria || null,
          parseFloat(item.cantidad) || 1,
          parseFloat(item.precio_unitario) || 0,
          parseFloat(item.subtotal) || 0,
          item.notas || null,
          item.fragmento_cliente || null,
          idx,
        ])
      }
    }

    await client.query('COMMIT')
    const full = await getPresupuestoCompleto(req.params.id)
    res.json({ success: true, data: full })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// ── PATCH /api/presupuestos/:id/estado ────────────────────────────────────
async function cambiarEstado(req, res, next) {
  try {
    const { estado } = req.body
    const VALID = ['borrador', 'enviado', 'aceptado', 'rechazado', 'expirado']
    if (!VALID.includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido' })
    }

    const { rowCount } = await query(
      'UPDATE presupuestos SET estado = $1 WHERE id = $2',
      [estado, req.params.id]
    )
    if (!rowCount) return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' })

    res.json({ success: true, data: { estado } })
  } catch (err) { next(err) }
}

// ── DELETE /api/presupuestos/:id ───────────────────────────────────────────
async function eliminar(req, res, next) {
  try {
    const { rowCount } = await query('DELETE FROM presupuestos WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' })
    res.json({ success: true, data: { message: 'Presupuesto eliminado' } })
  } catch (err) { next(err) }
}

// ── POST /api/presupuestos/:id/duplicar ───────────────────────────────────
async function duplicar(req, res, next) {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    const original = await getPresupuestoCompleto(req.params.id)
    if (!original) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' })
    }

    // Generate new unique numero
    let numero, unique = false
    while (!unique) {
      numero = generateNumero()
      const ex = await client.query('SELECT id FROM presupuestos WHERE numero = $1', [numero])
      unique = ex.rows.length === 0
    }

    const { rows: [nuevo] } = await client.query(`
      INSERT INTO presupuestos
        (numero, cliente_id, cliente_nombre, cliente_empresa, cliente_email, cliente_telefono,
         nombre_proyecto, tipo_proyecto, moneda, subtotal, descuento, impuesto, total,
         estado, validez_dias, notas, condiciones, creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'borrador',$14,$15,$16,$17)
      RETURNING id
    `, [
      numero, original.cliente_id, original.cliente_nombre, original.cliente_empresa,
      original.cliente_email, original.cliente_telefono,
      `${original.nombre_proyecto} (copia)`, original.tipo_proyecto,
      original.moneda, original.subtotal, original.descuento, original.impuesto, original.total,
      original.validez_dias, original.notas, original.condiciones, null,
    ])

    for (const item of original.items) {
      await client.query(`
        INSERT INTO presupuesto_items
          (presupuesto_id, servicio_id, descripcion_personalizada, categoria, cantidad, precio_unitario, subtotal, notas, orden)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [nuevo.id, item.servicio_id, item.descripcion_personalizada, item.categoria,
          item.cantidad, item.precio_unitario, item.subtotal, item.notas, item.orden])
    }

    await client.query('COMMIT')
    const full = await getPresupuestoCompleto(nuevo.id)
    res.status(201).json({ success: true, data: full })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// ── GET /api/presupuestos/:id/pdf ──────────────────────────────────────────
async function pdf(req, res, next) {
  try {
    const p = await getPresupuestoCompleto(req.params.id)
    if (!p) return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' })

    const buffer = await generarPDF(p)
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="presupuesto-${p.numero}.pdf"`,
      'Content-Length':      buffer.length,
    })
    res.send(buffer)
  } catch (err) { next(err) }
}

module.exports = { listar, metricas, obtener, crear, actualizar, cambiarEstado, eliminar, duplicar, pdf }
