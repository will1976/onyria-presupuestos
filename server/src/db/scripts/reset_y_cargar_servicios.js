/**
 * Borra todos los datos de clientes, presupuestos y servicios,
 * y carga el catálogo nuevo desde el CSV embebido.
 *
 * Uso: node server/src/db/scripts/reset_y_cargar_servicios.js
 */

require('dotenv').config()
const { pool } = require('../index')

// CSV limpio (encoding corregido: Ã³→ó, Ã±→ñ, â→—, Â°→°, etc.)
// Columnas: nombre;categoria;descripcion;precio_base;porcentaje_boleta;unidad;moneda;activo
const CSV = `nombre;categoria;descripcion;precio_base;porcentaje_boleta;unidad;moneda;activo
Reducción 50% — Valor Armado Madre;Estudio;Reducción del 50% aplicada sobre el valor del producto madre armado;0.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master 1' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;200000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  1' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;250000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  10'' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;80000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  10'' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;80000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  15'' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;120000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  15'' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;120000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  2' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;250000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  20'' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;150000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  20'' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;150000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  30'' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;150000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  30'' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;150000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  45'' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;180000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  45'' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;200000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  6'' — Solo Digital;Estudio;Post producción publicitaria — derechos Solo Digital;80000.00;0;por pieza;CLP;si
Sonorización / Post / Mix / Master  6'' — TV + Digital;Estudio;Post producción publicitaria — derechos TV + Digital;80000.00;0;por pieza;CLP;si
Casting — Digital, TV o Radio;Estudio;Servicio de casting para producción digital, televisión o radio;50000.00;0;por pieza;CLP;si
Música Archivo — Digital;musica_archivo;Licencia de música de archivo para medios digitales;50000.00;0;por pieza;CLP;si
Música Archivo — TV;musica_archivo;Licencia de música de archivo para televisión (200 USD);200.00;0;por pieza;USD;si
Música Premium Beat o Similar TV (precio Costo)A62;musica_archivo;Música Archivo Música Premium Beat o Similar TV (precio Costo);200000;1;por pieza;CLP;si
Música Premium Beat o Similar - Digital 50 USD;musica_archivo;Música Archivo Música Premium Beat o Similar - Digital 50 USD;100000;2;por pieza;CLP;si
Musica de Artlist / Envato - Digital;musica_archivo;Música Archivo Musica de Artlist / Envato - Digital;100000;3;por pieza;CLP;si
Musica de Artlist / Envato - Digital TV;musica_archivo;Música Archivo Musica de Artlist / Envato - Digital TV;50000;4;por pieza;CLP;si
Musica de Artlist / Envato - Radio;musica_archivo;Música Archivo Musica de Artlist / Envato - Radio;30000;5;por pieza;CLP;si
Música Original — Full Medios (TV+Digital+Radio);musica_original;Música original 45'' Chile, vigencia 6 a 12 meses — TV + Digital + Radio;700000.00;0;por pieza;CLP;si
Música Original — Solo Digital;musica_original;Música original 45'' Chile, vigencia 6 a 12 meses — Solo Digital;500000.00;0;por pieza;CLP;si
Música Original — Solo TV;musica_original;Música original 45'' Chile, vigencia 6 a 12 meses — Solo TV;500000.00;0;por pieza;CLP;si
Música Original — TV + Digital;musica_original;Música original 45'' Chile, vigencia 6 a 12 meses — TV + Digital;600000.00;0;por pieza;CLP;si
Renovación Derechos — 1° Año;renovacion_derecho;50% del Valor Inicial;0.00;0;por pieza;CLP;si
Renovación Derechos — 2° Año;renovacion_derecho;50% del Valor Inicial;0.00;0;por pieza;CLP;si
Renovación Derechos — 3° Año;renovacion_derecho;25% del Valor Inicial;0.00;0;por pieza;CLP;si
Renovación Derechos — 4° Año;renovacion_derecho;25% del Valor Inicial;0.00;0;por pieza;CLP;si
Locución 1' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;100000.00;15.25;por pieza;CLP;si
Locución 1' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;200000.00;15.25;por pieza;CLP;si
Locución 10'' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;80000.00;15.25;por pieza;CLP;si
Locución 10'' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;100000.00;15.25;por pieza;CLP;si
Locución 15'' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;80000.00;15.25;por pieza;CLP;si
Locución 15'' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;120000.00;15.25;por pieza;CLP;si
Locución 2' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;150000.00;15.25;por pieza;CLP;si
Locución 20'' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;80000.00;15.25;por pieza;CLP;si
Locución 20'' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;150000.00;15.25;por pieza;CLP;si
Locución 30'' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;80000.00;15.25;por pieza;CLP;si
Locución 30'' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;150000.00;15.25;por pieza;CLP;si
Locución 45'' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;80000.00;15.25;por pieza;CLP;si
Locución 45'' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;200000.00;15.25;por pieza;CLP;si
Locución 6'' — Solo Digital;Locutor;Valores referenciales locución — derechos Solo Digital hasta 12 meses;50000.00;15.25;por pieza;CLP;si
Locución 6'' — TV + Digital;Locutor;Valores referenciales locución — derechos TV + Digital hasta 12 meses;80000.00;15.25;por pieza;CLP;si
Personajes / Doblajes;Personajes - Doblajes;Personajes - Doblajes;60000.00;15.25;por pieza;CLP;si
Podcast — Grabación / Edición;podcast;Grabación y edición de podcast — valor por hora;40000.00;0;por hora;CLP;si`

function parseCSV(csv) {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(';')
  return lines.slice(1).map(line => {
    const values = line.split(';')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i]?.trim() })
    return obj
  })
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('Borrando datos...')
    await client.query('DELETE FROM presupuesto_items')
    await client.query('DELETE FROM presupuestos')
    await client.query('DELETE FROM clientes')
    await client.query('DELETE FROM servicios')
    console.log('  → Datos borrados de presupuesto_items, presupuestos, clientes, servicios')

    const servicios = parseCSV(CSV)
    console.log(`Insertando ${servicios.length} servicios...`)

    for (const s of servicios) {
      await client.query(
        `INSERT INTO servicios
          (nombre, categoria, descripcion, precio_base, porcentaje_boleta, unidad, moneda, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          s.nombre,
          s.categoria,
          s.descripcion,
          parseFloat(s.precio_base) || 0,
          parseFloat(s.porcentaje_boleta) || 0,
          s.unidad,
          s.moneda,
          s.activo === 'si',
        ]
      )
    }

    await client.query('COMMIT')
    console.log(`✓ ${servicios.length} servicios insertados correctamente`)

    // Resumen por categoría
    const { rows } = await client.query(
      'SELECT categoria, COUNT(*) as cant FROM servicios GROUP BY categoria ORDER BY categoria'
    )
    console.log('\nResumen por categoría:')
    rows.forEach(r => console.log(`  ${r.categoria.padEnd(25)} ${r.cant}`))
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
