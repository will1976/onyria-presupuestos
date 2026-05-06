const ExcelJS = require('exceljs')
const path    = require('path')
const fs      = require('fs')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template Excel Presupuesto.xlsx')

// ── Normalización ─────────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['''"""´`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim()
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

// ── Headers que identifican cada sección ─────────────────────────────────────
const SECTION_NORMS = {
  estudio:         ['estudio'],
  locutor:         ['locutor'],
  personajes:      ['personajes / doblajes', 'personajes/doblajes', 'personajes doblajes'],
  musica_original: ['musica original'],
  musica_archivo:  ['musica archivo'],
}

// ── Celdas a ignorar (no son ítems) ──────────────────────────────────────────
const SKIP_PATTERNS = [
  'item', 'valor unitario', 'cantidad', 'total', 'sub total', 'subtotal',
  'descuento', 'iva', 'boleta', 'cant', 'neto', 'calculado',
  'total proyecto', 'total estudio', 'total locutor',
  'total personajes', 'total musica', 'estado proyecto',
  'factura', 'fecha', 'participantes', 'rol', 'costos',
]
function shouldSkip(v) {
  if (!v) return true
  return SKIP_PATTERNS.some(p => v.startsWith(p) || v === p)
}

function templateExists() {
  return fs.existsSync(TEMPLATE_PATH)
}

// ── Escanea el template y construye mapas de posición ─────────────────────────
async function scanTemplate() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  const ws = wb.worksheets[0]

  // Paso 1: localizar headers de sección
  const sectionHeaders = {}  // sectionKey → { row, nameCol }
  ws.eachRow((row, rowNum) => {
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const v = norm(cell.value)
      for (const [sk, patterns] of Object.entries(SECTION_NORMS)) {
        if (patterns.includes(v) && !sectionHeaders[sk]) {
          sectionHeaders[sk] = { row: rowNum, nameCol: colNum }
        }
      }
    })
  })

  // Paso 2: determinar columnas de precio/cantidad por sección
  const sectionCols = {}
  for (const [sk, sh] of Object.entries(sectionHeaders)) {
    const cols = { nameCol: sh.nameCol, priceCol: null, qtyCol: null, boletaCol: null }

    for (let r = sh.row; r <= sh.row + 3; r++) {
      ws.getRow(r).eachCell({ includeEmpty: false }, (cell, colNum) => {
        const v = norm(cell.value)
        if (!cols.priceCol && colNum > sh.nameCol && (v.includes('valor') || v.includes('unitario'))) {
          cols.priceCol = colNum
        }
        if (!cols.qtyCol && colNum > sh.nameCol && (v === 'cantidad' || v === 'cant')) {
          cols.qtyCol = colNum
        }
        if (!cols.boletaCol && colNum > sh.nameCol && v.includes('boleta')) {
          cols.boletaCol = colNum
        }
      })
      if (cols.priceCol && cols.qtyCol) break
    }

    // Fallback a offsets estándar si los labels no se encontraron
    if (!cols.priceCol) cols.priceCol = sh.nameCol + 1
    if (!cols.qtyCol)   cols.qtyCol   = sh.nameCol + 2

    sectionCols[sk] = cols
  }

  // Paso 3: construir itemMap y emptyRows por sección
  const sortedSections = Object.entries(sectionHeaders)
    .sort(([, a], [, b]) => a.row - b.row)

  const itemMap   = {}  // normName → { row, nameCol, priceCol, qtyCol, boletaCol, section }
  const emptyRows = {}  // sectionKey → [posInfo, ...]
  for (const [sk] of sortedSections) emptyRows[sk] = []

  ws.eachRow((row, rowNum) => {
    // Determinar la sección de esta fila (la última sección cuyo header está antes de esta fila)
    let currentSection = null
    for (let i = sortedSections.length - 1; i >= 0; i--) {
      const [sk, sh] = sortedSections[i]
      if (rowNum > sh.row) { currentSection = sk; break }
    }
    if (!currentSection) return

    const cols = sectionCols[currentSection]
    if (!cols) return

    // Solo procesar filas en la misma columna de nombre que la sección
    const nameCell = row.getCell(cols.nameCol)
    const rawName  = nameCell.value?.toString()?.trim() || ''
    const normName = norm(rawName)

    if (shouldSkip(normName)) return

    const posInfo = {
      row:       rowNum,
      nameCol:   cols.nameCol,
      priceCol:  cols.priceCol,
      qtyCol:    cols.qtyCol,
      boletaCol: cols.boletaCol,
      section:   currentSection,
    }

    if (normName) {
      itemMap[normName] = posInfo
    } else {
      // Fila vacía candidata — verificar que tenga alguna celda con formato/fórmula
      const hasFormat = row.getCell(cols.qtyCol).numFmt ||
                        row.getCell(cols.priceCol).numFmt ||
                        row.getCell(cols.qtyCol).value !== null
      if (hasFormat) emptyRows[currentSection].push(posInfo)
    }
  })

  return { wb, ws, itemMap, emptyRows, sectionCols, sectionHeaders }
}

// ── Lee precios actuales del template ─────────────────────────────────────────
async function readTemplatePrices() {
  if (!templateExists()) return null
  const { ws, itemMap } = await scanTemplate()
  const prices = {}
  for (const [normName, pos] of Object.entries(itemMap)) {
    const val = ws.getRow(pos.row).getCell(pos.priceCol).value
    prices[normName] = parseFloat(val) || 0
  }
  return prices
}

// ── Calcula diferencias de precio entre los ítems del presupuesto y el template
async function getDiff(items) {
  if (!templateExists()) return { hasTemplate: false, diffs: [] }

  const templatePrices = await readTemplatePrices()
  const diffs = []

  for (const item of items) {
    const normName       = norm(item.descripcion_personalizada || item.descripcion || '')
    const precioApp      = parseFloat(item.precio_unitario) || 0
    const precioTemplate = templatePrices[normName]

    if (precioTemplate !== undefined && precioTemplate > 0 && precioTemplate !== precioApp) {
      diffs.push({
        normName,
        nombre:        item.descripcion_personalizada || item.descripcion || normName,
        precioApp,
        precioTemplate,
      })
    }
  }

  return { hasTemplate: true, diffs }
}

// ── Genera el Excel relleno a partir del template ─────────────────────────────
// opcionesPrecio: { [normName]: 'app' | 'template' }  — omitir = usar template
async function generarExcelTemplate(presupuesto, opcionesPrecio = {}) {
  const { wb, ws, itemMap, emptyRows } = await scanTemplate()
  const items = presupuesto.items || []

  for (const item of items) {
    const rawName  = item.descripcion_personalizada || item.descripcion || ''
    const normName = norm(rawName)
    const precioApp = parseFloat(item.precio_unitario) || 0
    const qty       = parseFloat(item.cantidad) || 0
    const boleta    = parseFloat(item.porcentaje_boleta) || 0

    // Nivel 1: match exacto en el template
    let pos = itemMap[normName]

    // Nivel 2: match parcial (la primera coincidencia que contenga las mismas palabras clave)
    if (!pos) {
      const words = normName.split(' ').filter(w => w.length > 2)
      for (const [key, p] of Object.entries(itemMap)) {
        const hits = words.filter(w => key.includes(w))
        if (hits.length > 0 && hits.length / words.length >= 0.6) { pos = p; break }
      }
    }

    // Nivel 3: fila vacía en la sección correspondiente
    if (!pos) {
      const section   = CAT_TO_SECTION[item.categoria] || 'estudio'
      const available = emptyRows[section]
      if (available && available.length > 0) {
        pos = available.shift()
        ws.getRow(pos.row).getCell(pos.nameCol).value = rawName
      }
    }

    if (!pos) continue  // no hay espacio

    const row = ws.getRow(pos.row)

    // Cantidad: siempre se actualiza
    row.getCell(pos.qtyCol).value = qty

    // Precio: solo si el usuario eligió usar el de la app
    if (opcionesPrecio[normName] === 'app' && precioApp > 0) {
      row.getCell(pos.priceCol).value = precioApp
    }

    // % Boleta: si la sección lo tiene
    if (pos.boletaCol && boleta > 0) {
      row.getCell(pos.boletaCol).value = boleta
    }
  }

  return wb.xlsx.writeBuffer()
}

module.exports = { templateExists, getDiff, generarExcelTemplate, readTemplatePrices }
