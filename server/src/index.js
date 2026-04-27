const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const morgan       = require('morgan')
const path         = require('path')

const config       = require('./config')
const errorHandler = require('./middleware/errorHandler')
const { apiLimiter } = require('./middleware/rateLimiter')
const { pool }     = require('./db')

// Routes
const authRoutes          = require('./routes/auth.routes')
const presupuestosRoutes  = require('./routes/presupuestos.routes')
const serviciosRoutes     = require('./routes/servicios.routes')
const clientesRoutes      = require('./routes/clientes.routes')
const iaRoutes            = require('./routes/ia.routes')

const app = express()

// ── Security & Logging ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled so PDF preview iframe works
}))
app.use(cors({
  origin:      config.clientUrl,
  credentials: true,
}))
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'))

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use('/api', apiLimiter)

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status:      'ok',
      service:     'Onyria Studio API',
      environment: config.nodeEnv,
      timestamp:   new Date().toISOString(),
    },
  })
})

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/presupuestos',  presupuestosRoutes)
app.use('/api/servicios',     serviciosRoutes)
app.use('/api/clientes',      clientesRoutes)
app.use('/api/ia',            iaRoutes)

// ── Servir React build en producción ──────────────────────────────────────
if (config.nodeEnv === 'production') {
  const clientBuild = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientBuild))
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'))
  })
} else {
  // ── 404 (solo en desarrollo) ─────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.path}` })
  })
}

// ── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler)

// ── Ensure ajuste columns exist (safety net independiente de migraciones) ──
pool.query(`
  ALTER TABLE presupuestos
    ADD COLUMN IF NOT EXISTS ajuste_total  NUMERIC,
    ADD COLUMN IF NOT EXISTS ajuste_motivo TEXT
`).then(() => {
  console.log('DB: columnas ajuste_total / ajuste_motivo OK')
}).catch(err => {
  console.error('DB: no se pudo agregar columnas ajuste:', err.message)
})

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log('')
  console.log('╔═══════════════════════════════════════╗')
  console.log('║   ONYRIA STUDIO — API Server          ║')
  console.log('╠═══════════════════════════════════════╣')
  console.log(`║  Port : ${config.port}                          ║`)
  console.log(`║  Env  : ${config.nodeEnv.padEnd(30)}║`)
  console.log(`║  DB   : ${config.db.url ? '✓ configured' : '✗ missing DATABASE_URL'}           ║`)
  console.log(`║  IA   : ${config.gemini.apiKey ? '✓ configured' : '✗ missing GEMINI_API_KEY'}           ║`)
  console.log('╚═══════════════════════════════════════╝')
  console.log('')
})

module.exports = app
