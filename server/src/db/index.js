const { Pool } = require('pg')
const config   = require('../config')

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('❌ [db] Unexpected pool error:', err.message)
})

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ [db] New client connected')
  }
})

// Helper: run a query with error context
async function query(text, params) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development') {
      console.log(`[db] query (${duration}ms):`, text.slice(0, 80).replace(/\s+/g, ' '))
    }
    return res
  } catch (err) {
    console.error('[db] Query error:', err.message, '\nSQL:', text)
    throw err
  }
}

// Helper: get a dedicated client for transactions
async function getClient() {
  return pool.connect()
}

module.exports = { query, getClient, pool }
