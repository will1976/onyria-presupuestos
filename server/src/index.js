const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const morgan       = require('morgan')
const path         = require('path')

const config       = require('./config')
const errorHandler = require('./middleware/errorHandler')
const { apiLimiter } = require('./middleware/rateLimiter')
const { migrate }    = require('./db/migrate')

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

// ── Servir React build si está presente ───────────────────────────────────
// Detectamos por existencia del bundle (no por NODE_ENV) para que el .exe
// empacado por Electron siempre sirva la SPA, incluso si NODE_ENV no llega
// correctamente al proceso (envs heredados pueden sobreescribir).
const fs = require('fs')
const clientBuild = path.join(__dirname, '../../client/dist')
const clientIndex = path.join(clientBuild, 'index.html')
const hasClientBuild = fs.existsSync(clientIndex)

if (hasClientBuild) {
  app.use(express.static(clientBuild))
  // Catch-all SPA: cualquier ruta no-API devuelve index.html para que React
  // Router maneje el deep linking interno
  app.get('*', (req, res) => {
    res.sendFile(clientIndex)
  })
} else {
  // Modo dev sin build: 404 JSON
  app.use((req, res) => {
    res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.path}` })
  })
}

// ── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler)

// ── Migraciones automáticas al arrancar (SQLite local) ────────────────────
try {
  migrate()
} catch (err) {
  console.error('Migration error on startup:', err.message)
}

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log('')
  console.log('╔═══════════════════════════════════════╗')
  console.log('║   ONYRIA STUDIO — API Server          ║')
  console.log('╠═══════════════════════════════════════╣')
  console.log(`║  Port : ${config.port}                          ║`)
  console.log(`║  Env  : ${config.nodeEnv.padEnd(30)}║`)
  console.log(`║  DB   : SQLite (${path.basename(config.db.file)})${' '.repeat(Math.max(0, 12 - path.basename(config.db.file).length))}║`)
  console.log(`║  IA   : ${config.gemini.apiKey ? '✓ configured' : '✗ missing GEMINI_API_KEY'}           ║`)
  console.log('╚═══════════════════════════════════════╝')
  console.log('')
})

module.exports = app
