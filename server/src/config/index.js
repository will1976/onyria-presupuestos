require('dotenv').config()

const config = {
  port:       process.env.PORT       || 3001,
  nodeEnv:    process.env.NODE_ENV   || 'development',
  clientUrl:  process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    url: process.env.DATABASE_URL,
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

// Warn about missing critical env vars
const required = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY']
required.forEach(key => {
  if (!process.env[key]) {
    console.warn(`⚠  [config] Missing env var: ${key}`)
  }
})

module.exports = config
