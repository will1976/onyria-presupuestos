require('dotenv').config()
const path = require('path')

const config = {
  port:       process.env.PORT       || 3001,
  nodeEnv:    process.env.NODE_ENV   || 'development',
  clientUrl:  process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    // Ruta del archivo SQLite. Por defecto se guarda en server/data/onyria.db
    file: process.env.DB_PATH || path.join(__dirname, '../../data/onyria.db'),
    // PRAGMA settings
    verbose: process.env.DB_VERBOSE === 'true',
  },

  jwt: {
    secret:    process.env.JWT_SECRET    || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },

  company: {
    name:    process.env.COMPANY_NAME    || 'Onyria Studio',
    email:   process.env.COMPANY_EMAIL   || 'contacto@onyria.cl',
    phone:   process.env.COMPANY_PHONE   || '+56 2 2345 6789',
    address: process.env.COMPANY_ADDRESS || 'Santiago, Chile',
  },
}

// Warn about missing critical env vars (DATABASE_URL ya no es requerido)
const required = ['JWT_SECRET']
required.forEach(key => {
  if (!process.env[key]) {
    console.warn(`⚠  [config] Missing env var: ${key}`)
  }
})

module.exports = config
