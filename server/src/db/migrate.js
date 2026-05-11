require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const { pool } = require('./index')

const MIGRATIONS = [
  '001_init.sql',
  '002_fragmento_cliente.sql',
  '003_clientes_activo.sql',
  '004_fix_categoria_enum.sql',
  '005_seed_servicios.sql',
  '006_ajuste_total.sql',
  '007_porcentaje_boleta.sql',
  '008_reset_y_recargar_catalogo.sql',
]

async function migrate() {
  console.log('Running migrations...')
  const client = await pool.connect()
  for (const file of MIGRATIONS) {
    const sqlFile = path.join(__dirname, 'migrations', file)
    if (!fs.existsSync(sqlFile)) {
      console.warn(`Migration file not found, skipping: ${file}`)
      continue
    }
    const sql = fs.readFileSync(sqlFile, 'utf8')
    console.log(`Running: ${file}`)
    try {
      await client.query(sql)
      console.log(`Done: ${file}`)
    } catch (err) {
      console.error(`Migration ${file} failed: ${err.message}`)
    }
  }
  console.log('All migrations attempted')
  client.release()
}

migrate()
