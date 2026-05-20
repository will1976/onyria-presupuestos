const ExcelJS = require('exceljs')
const path    = require('path')
const fs      = require('fs')
const { groupServicesByExcelCell, parseExcelCell, safeExcelCell, columnLetter } = require('./excelCell')
const { query } = require('../db')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template Excel Presupuesto.xlsx')

const log = (msg) => console.log(`[Excel Export] ${msg}`)

/**
 * Construye un mapa { nombreNormalizado → excel_cell } cargando todos los
 * servicios activos. Sirve como fallback cuando los items del presupuesto
 * tienen descripcion_personalizada pero servicio_id null (caso típico
 * cuando el item se creó con texto libre o vía pipeline IA sin link).
 */
async function loadExcelCellLookup() {
  const { rows } = await query(
    'SELECT nombre, excel_cell FROM servicios WHERE excel_cell IS NOT NULL'
  )
  const map = new Map()
  for (const r of rows) {
    if (!r.nombre || !r.excel_cell) continue
    map.set(String(r.nombre).trim().toLowerCase(), r.excel_cell)
  }
  return map
}

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
  'armado madre 30 45':  { row: 28, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'locutor' },
  'reduccion 20':        { row: 29, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'locutor' },
  'reduccion 15':        { row: 30, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'locutor' },
  'reducciones 6':       { row: 31, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'locutor' },
  'derechos cable':      { row: 32, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'locutor' },
  'radio':               { row: 33, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null, section: 'locutor' },

  // ── PERSONAJES / DOBLAJES (cols 7-11) ────────────────────────────────────
  'personajes doblajes': { row: 27, nameCol: 7, priceCol: 8, qtyCol: 9, boletaCol: null, section: 'personajes' },

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
  locutor:         [34, 35, 36].map(r =>   ({ row: r, nameCol: 1, priceCol: 2, qtyCol: 3, boletaCol: null,     section: 'locutor' })),
  personajes:      [28, 29, 30, 31, 32, 33, 34, 35].map(r => ({ row: r, nameCol: 7, priceCol: 8, qtyCol: 9, boletaCol: null, section: 'personajes' })),
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

// ── Encuentra la última fila ocupada de un worksheet ──────────────────────────
function findLastUsedRow(ws) {
  let last = 0
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    // Considerar fila "ocupada" si tiene al menos una celda con valor
    let hasValue = false
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        hasValue = true
      }
    })
    if (hasValue && rowNumber > last) last = rowNumber
  })
  return last
}

// ── Genera el Excel relleno ───────────────────────────────────────────────────
// Lógica nueva (excel_cell):
//   1. Cada ítem del presupuesto se mira contra el excel_cell de su servicio
//      (campo `servicio_excel_cell` provisto por el JOIN del controller, o
//      `excel_cell` directo en el item).
//   2. Si tiene celda → se agrupan los ítems por celda y se SUMAN las cantidades.
//      En el Excel se escribe SOLO el número (no el nombre).
//   3. Si NO tiene celda → se agrega al final del worksheet:
//        col A = nombre del servicio
//        col B = cantidad
//
// opcionesPrecio se mantiene para compatibilidad con el flujo de "diff de
// precios" (ITEM_MAP). Si en el futuro se elimina, sacar también el parámetro.
async function generarExcelTemplate(presupuesto, opcionesPrecio = {}) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  const ws = wb.worksheets[0]

  const items = presupuesto.items || []
  log(`Grouping services... (${items.length} items)`)

  // Lookup de fallback por nombre: para items sin servicio_id (texto libre)
  // o cuando el JOIN no encontró el servicio.
  const nameLookup = await loadExcelCellLookup()

  // Resolver excel_cell efectivo en este orden:
  //   1. el del item (override directo)
  //   2. el del servicio joinado por servicio_id
  //   3. lookup por descripcion_personalizada → catálogo
  const itemsForGroup = items.map(it => {
    let cell = safeExcelCell(it.excel_cell || it.servicio_excel_cell)
    if (!cell) {
      const nombreItem = (it.descripcion_personalizada || it.servicio_nombre || '').trim().toLowerCase()
      if (nombreItem && nameLookup.has(nombreItem)) {
        cell = nameLookup.get(nombreItem)
        log(`Match by name: "${it.descripcion_personalizada || it.servicio_nombre}" → ${cell}`)
      }
    }
    return {
      ...it,
      excel_cell: cell,
      cantidad:   parseFloat(it.cantidad) || 0,
    }
  })

  const { mapped, unmapped } = groupServicesByExcelCell(itemsForGroup)

  // Por cada celda mapeada, tomar el precio unitario del primer item con
  // ese excel_cell que tenga precio > 0 (items que comparten celda suelen
  // representar el mismo servicio lógico, así que comparten precio).
  const priceByCell = {}
  for (const it of itemsForGroup) {
    if (!it.excel_cell) continue
    const p = parseFloat(it.precio_unitario) || 0
    if (p > 0 && priceByCell[it.excel_cell] == null) {
      priceByCell[it.excel_cell] = p
    }
  }

  // 1) Escribir cantidades + precios unitarios agrupados.
  //    Cantidad va en la celda configurada (ej: C9)
  //    Precio unitario va en la columna anterior, misma fila (ej: B9)
  for (const [cell, qty] of Object.entries(mapped)) {
    const parsed = parseExcelCell(cell)
    if (!parsed) continue

    // Cantidad
    ws.getRow(parsed.row).getCell(parsed.colIndex).value = qty
    log(`Cell ${cell} = ${qty}`)

    // Precio unitario (columna anterior, misma fila). Solo si colIndex > 1.
    const price = priceByCell[cell]
    if (price && parsed.colIndex > 1) {
      ws.getRow(parsed.row).getCell(parsed.colIndex - 1).value = price
      log(`Cell ${columnLetter(parsed.colIndex - 1)}${parsed.row} (precio) = ${price}`)
    }
  }

  // 2) Items sin excel_cell → append al final con nombre + precio + cantidad
  if (unmapped.length > 0) {
    let appendRow = findLastUsedRow(ws) + 1
    for (const it of unmapped) {
      const nombre = it.descripcion_personalizada || it.servicio_nombre || '(sin nombre)'
      const qty    = parseFloat(it.cantidad) || 0
      const price  = parseFloat(it.precio_unitario) || 0
      ws.getRow(appendRow).getCell(1).value = nombre   // A: nombre
      ws.getRow(appendRow).getCell(2).value = price    // B: precio unitario
      ws.getRow(appendRow).getCell(3).value = qty      // C: cantidad
      log(`Unmapped service appended: ${nombre} (precio=${price}, qty=${qty})`)
      appendRow++
    }
  }

  // TOTAL NETO CLIENTE: usa el neto ajustado si existe, si no subtotal - descuento
  const subtotalVal  = parseFloat(presupuesto.subtotal)  || 0
  const descPct      = parseFloat(presupuesto.descuento) || 0
  const ajusteNeto   = presupuesto.ajuste_total != null ? parseFloat(presupuesto.ajuste_total) : null
  const netoCliente  = ajusteNeto !== null ? ajusteNeto : subtotalVal * (1 - descPct / 100)
  ws.getRow(13).getCell(10).value = netoCliente

  // Forzar recálculo completo al abrir en Excel
  wb.calcProperties = { fullCalcOnLoad: true }

  return wb.xlsx.writeBuffer()
}

module.exports = { templateExists, getDiff, generarExcelTemplate, readTemplatePrices }
