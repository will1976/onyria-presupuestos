const ExcelJS = require('exceljs')
const path    = require('path')
const fs      = require('fs')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template Excel Presupuesto.xlsx')

// ── Normalización ─────────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['''""`´]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

// ── Mapa estático de ítems del template (obtenido escaneando el archivo real) ──
// Estructura: normName → { row, nameCol, priceCol, qtyCol, boletaCol, section }
const ITEM_MAP = {
  // ── ESTUDIO (cols 1-4) ────────────────────────────────────────────────────
  'mix 60':              { row: 5,  nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'mix 45':              { row: 6,  nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'mix 30':              { row: 7,  nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'mix 20':              { row: 8,  nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'mix 15':              { row: 9,  nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'edicion':             { row: 10, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'gestion':             { row: 11, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'mix 15 pre roll':     { row: 12, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'mix 6 bumper':        { row: 13, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },
  'casting':             { row: 14, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'estudio' },

  // ── LOCUTOR (cols 1-5, con % Boleta en col 5) ─────────────────────────────
  'armado madre 30 45':  { row: 28, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5, section: 'locutor' },
  'reduccion 20':        { row: 29, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5, section: 'locutor' },
  'reduccion 15':        { row: 30, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5, section: 'locutor' },
  'reducciones 6':       { row: 31, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5, section: 'locutor' },
  'derechos cable':      { row: 32, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5, section: 'locutor' },
  'radio':               { row: 33, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5, section: 'locutor' },

  // ── PERSONAJES / DOBLAJES (cols 7-11) ────────────────────────────────────
  'personajes doblajes': { row: 27, nameCol: 7, priceCol: 8, qtyCol: 9, boletaCol: 11, section: 'personajes' },

  // ── MÚSICA ORIGINAL (cols 1-3) ────────────────────────────────────────────
  'musica original base': { row: 43, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },
  'cantante':             { row: 44, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },
  'guitarrista':          { row: 45, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },
  'violinista cuerdas':   { row: 46, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },
  'derechos tv':          { row: 47, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },
  'derechos digital':     { row: 48, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },
  'derechos radio':       { row: 49, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_original' },

  // ── MÚSICA ARCHIVO (cols 1-3) ─────────────────────────────────────────────
  'musica premium beat similar tv':      { row: 59, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_archivo' },
  'musica premium beat similar digital': { row: 60, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_archivo' },
  'musica artlist envato digital':       { row: 61, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_archivo' },
  'musica artlist envato digital tv':    { row: 62, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_archivo' },
  'musica artlist envato radio':         { row: 63, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'musica_archivo' },
}

// ── Filas vacías disponibles por sección ──────────────────────────────────────
const EMPTY_ROWS = {
  estudio:         [15, 16, 17, 18].map(r => ({ row: r, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null,  section: 'estudio' })),
  locutor:         [34, 35, 36].map(r =>   ({ row: r, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: 5,     section: 'locutor' })),
  personajes:      [28, 29, 30, 31, 32, 33, 34, 35].map(r => ({ row: r, nameCol: 7, priceCol: 8, qtyCol: 9, boletaCol: 11, section: 'personajes' })),
  musica_original: [50, 51].map(r =>       ({ row: r, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null,  section: 'musica_original' })),
  musica_archivo:  [64, 65].map(r =>       ({ row: r, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null,  section: 'musica_archivo' })),
}

// ── Categorías de la app → sección del template ───────────────────────────────
const CAT_TO_SECTION = {
  sonorizacion:    'estudio',
  locucion:        'locutor',
  casting:         'estudio',
  musica_original: 'musica_original',
  musica_archivo:  'musica_archivo',
  podcast:         'estudio',
  otro:            'estudio',
}

function templateExists() {
  return fs.existsSync(TEMPLATE_PATH)
}

// ── Busca el ítem en el mapa (exacto → parcial) ───────────────────────────────
function findInMap(normName) {
  if (ITEM_MAP[normName]) return ITEM_MAP[normName]

  // Coincidencia parcial: buscar por palabras clave
  const words = normName.split(' ').filter(w => w.length > 2)
  if (!words.length) return null

  let bestKey = null, bestScore = 0
  for (const key of Object.keys(ITEM_MAP)) {
    const hits = words.filter(w => key.includes(w))
    const score = hits.length / Math.max(words.length, key.split(' ').length)
    if (score > bestScore && score >= 0.5) { bestScore = score; bestKey = key }
  }
  return bestKey ? ITEM_MAP[bestKey] : null
}

// ── Lee precios actuales del template ─────────────────────────────────────────
async function readTemplatePrices() {
  if (!templateExists()) return null

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  const ws = wb.worksheets[0]

  const prices = {}
  for (const [key, pos] of Object.entries(ITEM_MAP)) {
    const val = ws.getRow(pos.row).getCell(pos.priceCol).value
    const price = parseFloat(val) || 0
    if (price > 0) prices[key] = price
  }
  return prices
}

// ── Calcula diferencias de precio ─────────────────────────────────────────────
async function getDiff(items) {
  if (!templateExists()) return { hasTemplate: false, diffs: [] }

  const templatePrices = await readTemplatePrices()
  const diffs = []

  for (const item of items) {
    const rawName    = item.descripcion_personalizada || item.servicio_nombre || ''
    const normName   = norm(rawName)
    const pos        = findInMap(normName)
    if (!pos) continue

    const mapKey         = Object.keys(ITEM_MAP).find(k => ITEM_MAP[k] === pos) || normName
    const precioTemplate = templatePrices[mapKey] || 0
    const precioApp      = parseFloat(item.precio_unitario) || 0

    if (precioTemplate > 0 && precioTemplate !== precioApp) {
      diffs.push({
        normName:      mapKey,
        nombre:        rawName,
        precioApp,
        precioTemplate,
      })
    }
  }

  return { hasTemplate: true, diffs }
}

// ── Genera el Excel relleno ───────────────────────────────────────────────────
// opcionesPrecio: { [normName]: 'app' | 'template' }
async function generarExcelTemplate(presupuesto, opcionesPrecio = {}) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  const ws = wb.worksheets[0]

  // Copia mutable de filas vacías para no agotar el array original
  const emptyAvail = {}
  for (const [sec, rows] of Object.entries(EMPTY_ROWS)) {
    emptyAvail[sec] = [...rows]
  }

  for (const item of presupuesto.items || []) {
    const rawName   = item.descripcion_personalizada || item.servicio_nombre || ''
    const normName  = norm(rawName)
    const precioApp = parseFloat(item.precio_unitario) || 0
    const qty       = parseFloat(item.cantidad) || 0
    const boleta    = parseFloat(item.porcentaje_boleta) || 0

    // Buscar posición en el mapa
    let pos = findInMap(normName)

    // Si no hay match, usar fila vacía de la sección correspondiente
    if (!pos) {
      const section = CAT_TO_SECTION[item.categoria] || 'estudio'
      const avail   = emptyAvail[section]
      if (avail && avail.length > 0) {
        pos = avail.shift()
        // Escribir nombre en la celda de nombre
        ws.getRow(pos.row).getCell(pos.nameCol).value = rawName
      }
    }

    if (!pos) continue

    const mapKey = Object.keys(ITEM_MAP).find(k => ITEM_MAP[k] === pos) || normName
    const row    = ws.getRow(pos.row)

    // Cantidad: siempre se actualiza
    row.getCell(pos.qtyCol).value = qty

    // Precio: se usa el del template solo cuando el usuario eligió explícitamente 'template'
    if (opcionesPrecio[mapKey] !== 'template' && precioApp > 0) {
      row.getCell(pos.priceCol).value = precioApp
    }

    // % Boleta: si la sección lo tiene
    if (pos.boletaCol && boleta > 0) {
      row.getCell(pos.boletaCol).value = boleta
    }
  }

  // TOTAL NETO CLIENTE: celda sin fórmula, hay que escribirla explícitamente
  ws.getRow(13).getCell(10).value = parseFloat(presupuesto.subtotal) || 0

  // Forzar recálculo completo al abrir en Excel
  wb.calcProperties = { fullCalcOnLoad: true }

  return wb.xlsx.writeBuffer()
}

module.exports = { templateExists, getDiff, generarExcelTemplate, readTemplatePrices }
