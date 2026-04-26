require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const { pool } = require('./index')

async function migrate() {
  console.log('🔄 Running migrations...')
  const sqlFile = path.join(__dirname, 'migrations', '001_init.sql')
  const sql     = fs.readFileSync(sqlFile, 'utf8')

  try {
    await pool.query(sql)
    console.log('✅ Migrations complete')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
