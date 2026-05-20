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

if (!app) {
  console.error('[Electron] FATAL: electron.app is undefined. ¿ELECTRON_RUN_AS_NODE seteado en el sistema?')
  process.exit(1)
}

// ── Single instance ──────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit(); process.exit(0) }

const log = (...args) => console.log('[Electron]', ...args)
const errLog = (...args) => console.error('[Electron]', ...args)

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
const PORT = process.env.PORT || '3001'

function setBackendEnv() {
  process.env.NODE_ENV            = 'production'
  process.env.PORT                = String(PORT)
  process.env.DB_PATH             = DB_PATH
  process.env.TRANSFORMERS_CACHE  = TRANSFORMERS_CACHE
  process.env.CLIENT_URL          = `http://localhost:${PORT}`
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'onyria_local_jwt_' + Date.now()
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    try {
      log('Starting backend...')
      const serverPath = resourcePath('server', 'src', 'index.js')
      require(serverPath)
      // Backend hace app.listen async; esperamos a que responda /health
      waitForHealth(`http://localhost:${PORT}/health`, 30000)
        .then(() => { log('Backend ready'); resolve() })
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

function waitForHealth(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tryOnce = () => {
      const req = http.get(url, res => {
        if (res.statusCode === 200) return resolve()
        retry()
      })
      req.on('error', retry)
      req.setTimeout(1000, () => { req.destroy(); retry() })
    }
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error(`Backend no respondió en ${timeoutMs}ms`))
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

  mainWindow.loadURL(`http://localhost:${PORT}/`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Opening app window')
  })

  mainWindow.on('closed', () => { mainWindow = null })

  // Links externos → navegador del sistema (no abrir dentro de la app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    ensureUserDirs()
    setBackendEnv()
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
