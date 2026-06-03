/**
 * Electron main process — Onyria Studio Presupuestos
 *
 * Flujo:
 *   1. Calcula rutas de datos del usuario (AppData/Local/Onyria/).
 *   2. Si es primera ejecución, copia BD seed + cache de embeddings.
 *   3. Setea env vars (DB_PATH, TRANSFORMERS_CACHE, NODE_ENV, PORT).
 *   4. Levanta el backend Express in-process (require directo).
 *   5. Espera a que /health responda.
 *   6. Abre BrowserWindow apuntando a http://localhost:3001/.
 *   7. Cierra todo limpiamente al salir.
 */

// Si ELECTRON_RUN_AS_NODE está seteado en el environment del sistema, Electron
// arranca en modo "node puro" y require('electron') retorna un string en vez
// de la API. Lo borramos defensivamente al inicio.
delete process.env.ELECTRON_RUN_AS_NODE

const { app, BrowserWindow, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs   = require('fs')
const http = require('http')
const net  = require('net')

if (!app) {
  console.error('[Electron] FATAL: electron.app is undefined. ¿ELECTRON_RUN_AS_NODE seteado en el sistema?')
  process.exit(1)
}

// ── Single instance ──────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit(); process.exit(0) }

// ── File logging ─────────────────────────────────────────────────────────────
// Stdout/stderr no son visibles cuando el .exe se lanza desde el shortcut
// de Windows (GUI subsystem). Espejamos los logs a un archivo en
// %LOCALAPPDATA%\Onyria\logs\ para poder diagnosticar en el cliente.
let logStream = null
;(function initFileLogging() {
  try {
    const os = require('os')
    const base = process.env.LOCALAPPDATA
      || path.join(os.homedir(), 'AppData', 'Local')
    const logDir = path.join(base, 'Onyria', 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    const logFile = path.join(logDir, `main-${new Date().toISOString().slice(0,10)}.log`)
    logStream = fs.createWriteStream(logFile, { flags: 'a' })
    logStream.write(`\n\n===== ${new Date().toISOString()} ===== app start (pid=${process.pid}) =====\n`)
  } catch (e) {
    // Si no podemos abrir log file, seguimos sin él
  }
})()

function writeLog(level, args) {
  if (!logStream) return
  try {
    const line = `[${new Date().toISOString()}] [${level}] ` + args.map(a =>
      typeof a === 'string' ? a : (a instanceof Error ? `${a.message}\n${a.stack}` : JSON.stringify(a))
    ).join(' ') + '\n'
    logStream.write(line)
  } catch {}
}

const log = (...args) => { try { console.log('[Electron]', ...args) } catch {}; writeLog('INFO', args) }
const errLog = (...args) => { try { console.error('[Electron]', ...args) } catch {}; writeLog('ERROR', args) }

// ── Paths ────────────────────────────────────────────────────────────────────
const isPackaged = app.isPackaged

// Usuario final → AppData/Local/Onyria/
const USER_DATA_DIR = path.join(
  process.env.LOCALAPPDATA || app.getPath('appData'),
  'Onyria'
)
const DB_PATH            = path.join(USER_DATA_DIR, 'onyria.db')
const TRANSFORMERS_CACHE = path.join(USER_DATA_DIR, 'transformers-cache')
const LOG_DIR            = path.join(USER_DATA_DIR, 'logs')

// Resources empacados.
//
// En packaged mode, main.js corre desde adentro del .asar, así que
// __dirname = '<install>/resources/app.asar/electron-app'. Los paths
// relativos resuelven automáticamente:
//   - Archivos JS (require) → Node lee transparente desde dentro del asar
//   - Archivos en asarUnpack (data/templates/imágenes) → fs reads también
//     son transparentes; Node redirige a app.asar.unpacked sin intervención
function resourcePath(...segments) {
  return path.join(__dirname, '..', ...segments)
}

// Para copyFileSync / mkdirSync de seeds (server/data) necesitamos rutas
// REALES en disco (asar es virtual). Como server/data está en asarUnpack,
// la versión "real" vive en app.asar.unpacked en packaged mode.
function unpackedPath(...segments) {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', ...segments)
  }
  return path.join(__dirname, '..', ...segments)
}

const SEED_DB                  = unpackedPath('server', 'data', 'onyria.db')
const SEED_TRANSFORMERS_CACHE  = unpackedPath('server', 'data', 'transformers-cache')

// ── Setup writable user dir + first-run seed ─────────────────────────────────
function ensureUserDirs() {
  if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true })
  if (!fs.existsSync(LOG_DIR))       fs.mkdirSync(LOG_DIR,       { recursive: true })

  // BD inicial: copiar solo si no existe (preserva datos del usuario)
  if (!fs.existsSync(DB_PATH)) {
    if (fs.existsSync(SEED_DB)) {
      fs.copyFileSync(SEED_DB, DB_PATH)
      log('Database seeded from package:', DB_PATH)
    } else {
      log('No seed DB found, app will create empty DB at:', DB_PATH)
    }
  } else {
    log('Database found:', DB_PATH)
  }

  // Cache embeddings: copiar entera si no existe (evita re-descargar ~25MB)
  if (!fs.existsSync(TRANSFORMERS_CACHE) && fs.existsSync(SEED_TRANSFORMERS_CACHE)) {
    copyDirRecursive(SEED_TRANSFORMERS_CACHE, TRANSFORMERS_CACHE)
    log('Embeddings cache seeded:', TRANSFORMERS_CACHE)
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src,  entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath)
    else                     fs.copyFileSync(srcPath, destPath)
  }
}

// ── Backend lifecycle ────────────────────────────────────────────────────────
// El puerto se elige dinámicamente al arrancar — pedimos al SO un puerto
// libre (rango efímero) en vez de hardcodear 3001. Si el cliente tiene OTRO
// software escuchando 3001, antes esto causaba que la BrowserWindow cargara
// el contenido de ese otro programa.
let port = 0

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const p = server.address().port
      server.close(() => resolve(p))
    })
  })
}

function setBackendEnv() {
  process.env.NODE_ENV            = 'production'
  process.env.PORT                = String(port)
  process.env.DB_PATH             = DB_PATH
  process.env.TRANSFORMERS_CACHE  = TRANSFORMERS_CACHE
  process.env.CLIENT_URL          = `http://localhost:${port}`
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'onyria_local_jwt_' + Date.now()
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    try {
      log('Starting backend...')
      // Redirigimos el console del backend al log file
      const origConsoleLog   = console.log
      const origConsoleError = console.error
      const origConsoleWarn  = console.warn
      console.log   = (...args) => { try { origConsoleLog(...args)   } catch {}; writeLog('LOG',   args) }
      console.error = (...args) => { try { origConsoleError(...args) } catch {}; writeLog('ERR',   args) }
      console.warn  = (...args) => { try { origConsoleWarn(...args)  } catch {}; writeLog('WARN',  args) }

      const serverPath = resourcePath('server', 'src', 'index.js')
      log('Requiring server from: ' + serverPath)
      require(serverPath)
      log('Server module loaded; waiting for /health...')
      waitForHealth(`http://localhost:${port}/health`, 60000)
        .then(() => { log('Backend ready'); resolve() })
        .catch(reject)
    } catch (err) {
      errLog('startBackend error:', err)
      reject(err)
    }
  })
}

// waitForHealth ahora verifica que /health responda con el JSON de Onyria
// (service === 'Onyria Studio API'). Si otra cosa devuelve 200 en ese puerto,
// lo rechazamos en vez de cargarlo en la BrowserWindow.
function waitForHealth(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tryOnce = () => {
      const req = http.get(url, res => {
        if (res.statusCode !== 200) return retry()
        let body = ''
        res.on('data', chunk => { body += chunk })
        res.on('end', () => {
          try {
            const j = JSON.parse(body)
            if (j && j.data && j.data.service === 'Onyria Studio API') return resolve()
          } catch {}
          retry()
        })
      })
      req.on('error', retry)
      req.setTimeout(1000, () => { req.destroy(); retry() })
    }
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error(`Backend Onyria no respondió en ${timeoutMs}ms`))
      setTimeout(tryOnce, 200)
    }
    tryOnce()
  })
}

// ── Window ───────────────────────────────────────────────────────────────────
let mainWindow = null

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.ico')
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0A0A0B',
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: 'Onyria Studio Presupuestos',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Menú minimal en producción (sin DevTools por defecto)
  if (isPackaged) Menu.setApplicationMenu(null)

  mainWindow.loadURL(`http://localhost:${port}/`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Opening app window')
  })

  mainWindow.on('closed', () => { mainWindow = null })

  // Links externos → navegador del sistema (no abrir dentro de la app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${port}`)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    log('App ready. isPackaged=' + isPackaged + ' platform=' + process.platform + ' arch=' + process.arch)
    log('USER_DATA_DIR=' + USER_DATA_DIR)
    log('Resource base=' + path.join(__dirname, '..'))
    ensureUserDirs()
    port = await pickFreePort()
    log('Free port picked: ' + port)
    setBackendEnv()
    log('NODE_ENV=' + process.env.NODE_ENV + ' PORT=' + process.env.PORT)
    log('DB_PATH=' + process.env.DB_PATH)
    log('TRANSFORMERS_CACHE=' + process.env.TRANSFORMERS_CACHE)
    await startBackend()
    createWindow()
  } catch (err) {
    errLog('Failed to start app:', err)
    dialog.showErrorBox(
      'No se pudo iniciar Onyria',
      `Detalle: ${err.message || err}\n\nLogs en:\n${LOG_DIR}`,
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  log('All windows closed → quitting')
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  // Si el usuario abre un segundo .exe, llevamos foco a la ventana existente
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Captura errores no manejados para no crashear silenciosamente
process.on('uncaughtException', err => errLog('uncaughtException:', err))
process.on('unhandledRejection', err => errLog('unhandledRejection:', err))
