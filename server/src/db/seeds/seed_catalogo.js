require('dotenv').config()
const { pool } = require('../index')

const SERVICIOS = [
  // ── Sonorización / Post / Mix / Master — TV + Digital ─────────────────────
  { nombre: "Sonorización 6'' — TV + Digital",   categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 80000,  unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 10'' — TV + Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 80000,  unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 15'' — TV + Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 120000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 20'' — TV + Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 150000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 30'' — TV + Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 150000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 45'' — TV + Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 200000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 1' — TV + Digital",    categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos TV + Digital',  precio_base: 250000, unidad: 'por pieza',         moneda: 'CLP' },
  // ── Sonorización / Post / Mix / Master — Solo Digital ─────────────────────
  { nombre: "Sonorización 6'' — Solo Digital",   categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 80000,  unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 10'' — Solo Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 80000,  unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 15'' — Solo Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 120000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 20'' — Solo Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 150000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 30'' — Solo Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 150000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 45'' — Solo Digital",  categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 180000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 1' — Solo Digital",    categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 200000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: "Sonorización 2' — Solo Digital",    categoria: 'sonorizacion', descripcion: 'Post producción publicitaria — derechos Solo Digital',  precio_base: 250000, unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: 'Reducción 50% — Valor Armado Madre', categoria: 'sonorizacion', descripcion: 'Reducción del 50% aplicada sobre el valor del producto madre armado', precio_base: 0, unidad: 'por pieza', moneda: 'CLP' },

  // ── Casting ────────────────────────────────────────────────────────────────
  { nombre: 'Casting — Digital, TV o Radio',     categoria: 'casting',       descripcion: 'Servicio de casting para producción digital, televisión o radio', precio_base: 50000,  unidad: 'por pieza',         moneda: 'CLP' },

  // ── Música Archivo ─────────────────────────────────────────────────────────
  { nombre: 'Música Archivo — Digital',          categoria: 'musica_archivo', descripcion: 'Licencia de música de archivo para medios digitales',            precio_base: 50000,  unidad: 'por pieza',         moneda: 'CLP' },
  { nombre: 'Música Archivo — TV',               categoria: 'musica_archivo', descripcion: 'Licencia de música de archivo para televisión (200 USD)',        precio_base: 200,    unidad: 'por pieza',         moneda: 'USD' },

  // ── Música Original 45'' Chile — 6 a 12 meses ─────────────────────────────
  { nombre: "Música Original — Solo Digital",                categoria: 'musica_original', descripcion: "Música original 45'' Chile, vigencia 6 a 12 meses — Solo Digital",              precio_base: 500000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Música Original — Solo TV",                     categoria: 'musica_original', descripcion: "Música original 45'' Chile, vigencia 6 a 12 meses — Solo TV",                  precio_base: 500000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Música Original — TV + Digital",                categoria: 'musica_original', descripcion: "Música original 45'' Chile, vigencia 6 a 12 meses — TV + Digital",              precio_base: 600000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Música Original — Full Medios (TV+Digital+Radio)", categoria: 'musica_original', descripcion: "Música original 45'' Chile, vigencia 6 a 12 meses — TV + Digital + Radio", precio_base: 700000, unidad: 'por pieza', moneda: 'CLP' },

  // ── Renovación Derechos Músicas ────────────────────────────────────────────
  { nombre: 'Renovación Derechos — 1° Año',      categoria: 'musica_original', descripcion: '50% del Valor Inicial',  precio_base: 0, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: 'Renovación Derechos — 2° Año',      categoria: 'musica_original', descripcion: '50% del Valor Inicial',  precio_base: 0, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: 'Renovación Derechos — 3° Año',      categoria: 'musica_original', descripcion: '25% del Valor Inicial',  precio_base: 0, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: 'Renovación Derechos — 4° Año',      categoria: 'musica_original', descripcion: '25% del Valor Inicial',  precio_base: 0, unidad: 'por pieza', moneda: 'CLP' },

  // ── Locución — TV + Digital (Hasta 12 Meses) ──────────────────────────────
  { nombre: "Locución 6'' — TV + Digital",       categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 10'' — TV + Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 100000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 15'' — TV + Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 120000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 20'' — TV + Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 150000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 30'' — TV + Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 150000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 45'' — TV + Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 200000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 1' — TV + Digital",        categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  precio_base: 200000, unidad: 'por pieza', moneda: 'CLP' },
  // ── Locución — Solo Digital (Hasta 12 Meses) ──────────────────────────────
  { nombre: "Locución 6'' — Solo Digital",       categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 50000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 10'' — Solo Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 15'' — Solo Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 20'' — Solo Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 30'' — Solo Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 45'' — Solo Digital",      categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 1' — Solo Digital",        categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 100000, unidad: 'por pieza', moneda: 'CLP' },
  { nombre: "Locución 2' — Solo Digital",        categoria: 'locucion', descripcion: 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', precio_base: 150000, unidad: 'por pieza', moneda: 'CLP' },

  // ── Podcast ────────────────────────────────────────────────────────────────
  { nombre: 'Podcast — Grabación / Edición',     categoria: 'podcast', descripcion: 'Grabación y edición de podcast — valor por hora', precio_base: 40000, unidad: 'por hora', moneda: 'CLP' },
]

async function seedCatalogo() {
  console.log('🌱 Cargando catálogo real de servicios...')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Limpiar datos demo
    await client.query('DELETE FROM presupuesto_items')
    console.log('  ✓ presupuesto_items limpio')
    await client.query('DELETE FROM presupuestos')
    console.log('  ✓ presupuestos limpio')
    await client.query('DELETE FROM servicios')
    console.log('  ✓ servicios limpio')

    // Insertar catálogo real
    for (const s of SERVICIOS) {
      await client.query(
        `INSERT INTO servicios (nombre, categoria, descripcion, precio_base, unidad, moneda)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [s.nombre, s.categoria, s.descripcion, s.precio_base, s.unidad, s.moneda]
      )
    }
    console.log(`  ✓ ${SERVICIOS.length} servicios insertados`)

    await client.query('COMMIT')
    console.log('\n✅ Catálogo cargado correctamente')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seedCatalogo()
