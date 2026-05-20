/**
 * Helpers para validar y agrupar referencias de celda Excel.
 *
 * Formato aceptado: una o más letras (A–Z) seguidas de uno o más dígitos.
 * Las letras se normalizan a mayúsculas.
 *   válidos: A1, A15, B22, AA105
 *   inválidos: '', 'A', '15', 'a 15', 'AB-3', null
 */

const EXCEL_CELL_REGEX = /^[A-Z]+[0-9]+$/

/**
 * Valida y normaliza una referencia de celda Excel.
 * @param {string|null|undefined} raw
 * @returns {{ok:true, value:string} | {ok:false, error:string}}
 */
function validateExcelCell(raw) {
  if (raw == null || raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string')   return { ok: false, error: 'excel_cell debe ser texto' }
  const cleaned = raw.trim().toUpperCase()
  if (!EXCEL_CELL_REGEX.test(cleaned)) {
    return { ok: false, error: `Formato inválido: "${raw}". Ej válidos: A15, B22, AA105` }
  }
  return { ok: true, value: cleaned }
}

/**
 * Versión "lenient" para llamadas internas: si formato inválido devuelve null
 * en vez de error, así no rompe flujos existentes.
 */
function safeExcelCell(raw) {
  const r = validateExcelCell(raw)
  return r.ok ? r.value : null
}

/**
 * Convierte un índice de columna 1-based en letra(s) Excel.
 *   1 → 'A', 26 → 'Z', 27 → 'AA', 702 → 'ZZ'
 */
function columnLetter(colIndex) {
  if (!Number.isInteger(colIndex) || colIndex < 1) return ''
  let n = colIndex
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/**
 * Parsea una celda como "A15" → { column: 'A', row: 15, colIndex: 1 }
 * colIndex es 1-based (A=1, B=2, ..., Z=26, AA=27).
 */
function parseExcelCell(cell) {
  if (!cell) return null
  const m = String(cell).toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  const col = m[1]
  const row = parseInt(m[2], 10)
  let colIndex = 0
  for (let i = 0; i < col.length; i++) {
    colIndex = colIndex * 26 + (col.charCodeAt(i) - 64)
  }
  return { column: col, row, colIndex }
}

/**
 * Agrupa items (con cantidad + excel_cell) por celda, sumando cantidades.
 *
 * Input:  [{excel_cell:'A15', cantidad:2}, {excel_cell:'A15', cantidad:1}, {excel_cell:'B22', cantidad:3}, {excel_cell:null, ...}]
 * Output: { mapped: {'A15': 3, 'B22': 3}, unmapped: [{excel_cell:null, ...}, ...] }
 *
 * Servicios sin excel_cell quedan en `unmapped` para que el caller los agregue
 * al final de la plantilla.
 *
 * @param {Array<{excel_cell?:string|null, cantidad?:number, [k:string]:any}>} items
 * @returns {{mapped: Record<string, number>, unmapped: Array<any>}}
 */
function groupServicesByExcelCell(items) {
  const mapped   = {}
  const unmapped = []

  for (const it of items || []) {
    const cell = safeExcelCell(it.excel_cell)
    const qty  = Number(it.cantidad) || 0

    if (!cell) {
      unmapped.push(it)
      continue
    }
    mapped[cell] = (mapped[cell] || 0) + qty
  }

  return { mapped, unmapped }
}

module.exports = {
  EXCEL_CELL_REGEX,
  validateExcelCell,
  safeExcelCell,
  parseExcelCell,
  columnLetter,
  groupServicesByExcelCell,
}
