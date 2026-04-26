require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const bcrypt = require('bcryptjs')
const { query, pool } = require('../index')

async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // ── Admin user ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('onyria2025', 12)
    const userRes = await query(`
      INSERT INTO usuarios (nombre, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, ['Admin', 'admin@onyria.cl', passwordHash])
    const adminId = userRes.rows[0].id
    console.log('  ✓ Admin user')

    // ── Servicios ───────────────────────────────────────────────
    const servicios = [
      ['Mezcla Spot Publicitario 30s',          'postproduccion_publicitaria', 'Mezcla stereo completa para spot de 30 segundos. Incluye premix, FX y revisiones.',         180000, 'por pieza',             'CLP'],
      ['Mezcla Spot Publicitario 60s',          'postproduccion_publicitaria', 'Mezcla stereo completa para spot de 60 segundos.',                                           250000, 'por pieza',             'CLP'],
      ['Diseño Sonoro — Identidad de Marca',    'diseno_sonoro',              'Creación de identidad sonora completa: jingle, earcon y variaciones.',                         1200,  'por proyecto',          'USD'],
      ['Diseño Sonoro — Efectos de Sonido',     'diseno_sonoro',              'Creación de efectos de sonido personalizados.',                                                  450,  'por hora',              'USD'],
      ['Mezcla Dolby Atmos — Largometraje',     'atmos',                     'Mezcla inmersiva 7.1.4 para sala de cine certificada.',                                         4500,  'por hora de contenido', 'USD'],
      ['Mezcla Dolby Atmos — Serie',            'atmos',                     'Mezcla Atmos para episodio de serie / documental.',                                              2800,  'por episodio',          'USD'],
      ['Doblaje — Narración',                   'localizacion_doblaje',       'Locución profesional, dirección, grabación y mezcla final.',                                   95000, 'por minuto',            'CLP'],
      ['Localización — Subtítulos',             'localizacion_doblaje',       'Traducción y sincronización de subtítulos.',                                                   45000, 'por minuto',            'CLP'],
      ['Mezcla Serie Ficción — Episodio 60min', 'mezcla_ficcion',             'Mezcla 5.1 completa para episodio de 60 minutos de ficción.',                               2800000, 'por episodio',          'CLP'],
      ['Mezcla Serie Ficción — Episodio 30min', 'mezcla_ficcion',             'Mezcla 5.1 para episodio de 30 minutos.',                                                   1600000, 'por episodio',          'CLP'],
      ['Audio Interactivo — Videojuego',        'audio_interactivo',          'Implementación de audio en motor Unity o Unreal Engine. Incluye Wwise/FMOD.',                   0,  'por hito',              'USD'],
      ['Postproducción Audio — Podcast',        'otro',                       'Edición, limpieza y mezcla final para episodio de podcast.',                                  35000, 'por episodio',          'CLP'],
    ]

    for (const [nombre, categoria, descripcion, precio_base, unidad, moneda] of servicios) {
      await query(`
        INSERT INTO servicios (nombre, categoria, descripcion, precio_base, unidad, moneda)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [nombre, categoria, descripcion, precio_base, unidad, moneda])
    }
    console.log(`  ✓ ${servicios.length} servicios`)

    // ── Clientes ────────────────────────────────────────────────
    const clientes = [
      ['Canal 13',      'Canal 13 S.A.',       'produccion@canal13.cl',       '+56 2 2707 1300'],
      ['Netflix Chile', 'Netflix Inc.',         'carolina.mendez@netflix.com', '+56 9 8765 4321'],
      ['Spotify LATAM', 'Spotify AB',           'latam@spotify.com',           null              ],
      ['Warner Bros.',  'Warner Bros. Latin Am','wbla@warnerbros.com',         null              ],
      ['Claro Chile',   'América Móvil Chile',  'marketing@claro.cl',          '+56 2 2555 0000'],
    ]

    const clienteIds = []
    for (const [nombre, empresa, email, telefono] of clientes) {
      const res = await query(`
        INSERT INTO clientes (nombre, empresa, email, telefono)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [nombre, empresa, email, telefono])
      if (res.rows[0]) clienteIds.push(res.rows[0].id)
    }
    console.log(`  ✓ ${clienteIds.length} clientes`)

    // ── Presupuestos demo ───────────────────────────────────────
    const [cid1, cid2, cid3, cid4, cid5] = clienteIds

    const presupuestosDemo = [
      { numero: 'ONY-2025-039', cid: cid5, nombre: 'Spots Radio Q4',        tipo: 'postproduccion_publicitaria', moneda: 'CLP', subtotal: 1008403, descuento: 0, impuesto: 191597,  total: 1200000,  estado: 'rechazado', fecha: '2025-01-10' },
      { numero: 'ONY-2025-040', cid: cid4, nombre: 'Doblaje Feature Film',   tipo: 'localizacion_doblaje',        moneda: 'USD', subtotal: 18487,   descuento: 0, impuesto: 3513,    total: 22000,    estado: 'aceptado',  fecha: '2025-01-08' },
      { numero: 'ONY-2025-041', cid: cid3, nombre: 'Podcast Series S2',      tipo: 'diseno_sonoro',               moneda: 'USD', subtotal: 4034,    descuento: 0, impuesto: 766,     total: 4800,     estado: 'enviado',   fecha: '2025-01-18' },
      { numero: 'ONY-2025-042', cid: cid1, nombre: 'Campaña Verano 2025',    tipo: 'postproduccion_publicitaria', moneda: 'CLP', subtotal: 2394958, descuento: 0, impuesto: 455042,  total: 2850000,  estado: 'aceptado',  fecha: '2025-01-15' },
      { numero: 'ONY-2025-043', cid: cid2, nombre: 'Serie Documental Ritmos',tipo: 'mezcla_ficcion',              moneda: 'CLP', subtotal: 10420168,descuento: 5, impuesto: 1979832, total: 12400000, estado: 'borrador',  fecha: '2025-01-20' },
    ]

    for (const p of presupuestosDemo) {
      const res = await query(`
        INSERT INTO presupuestos
          (numero, cliente_id, nombre_proyecto, tipo_proyecto, moneda,
           subtotal, descuento, impuesto, total, estado,
           fecha_emision, creado_por)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (numero) DO NOTHING
        RETURNING id
      `, [p.numero, p.cid, p.nombre, p.tipo, p.moneda,
          p.subtotal, p.descuento, p.impuesto, p.total, p.estado,
          p.fecha, adminId])

      if (res.rows[0]) {
        // Add a sample item
        await query(`
          INSERT INTO presupuesto_items
            (presupuesto_id, descripcion_personalizada, categoria, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, 1, $4, $4)
        `, [res.rows[0].id, p.nombre, p.tipo, p.subtotal])
      }
    }
    console.log(`  ✓ ${presupuestosDemo.length} presupuestos demo`)

    console.log('\n✅ Seed complete!')
    console.log('   Email:    admin@onyria.cl')
    console.log('   Password: onyria2025')

  } catch (err) {
    console.error('❌ Seed failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
