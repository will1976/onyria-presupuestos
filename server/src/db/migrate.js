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
]

async function migrate() {
  console.log('Running migrations...')
  const client = await pool.connect()
  try {
    for (const file of MIGRATIONS) {
      const sqlFile = path.join(__dirname, 'migrations', file)
      if (!fs.existsSync(sqlFile)) {
        console.warn(`Migration file not found, skipping: ${file}`)
        continue
      }
      const sql = fs.readFileSync(sqlFile, 'utf8')
      console.log(`Running: ${file}`)
      await client.query(sql)
      console.log(`Done: ${file}`)
    }
    console.log('All migrations complete')
  } catch (err) {
    console.error('Migration error:', err.message)
  } finally {
    client.release()
  }
}

migrate()
