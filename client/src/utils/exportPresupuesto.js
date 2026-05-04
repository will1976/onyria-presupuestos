import ExcelJS from 'exceljs'
import { CATEGORIAS } from '../components/theme'

const CAT_LABEL = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.label]))

// ── helpers de estilo ──────────────────────────────────────────────────────
const bold        = (size = 11) => ({ bold: true, size, name: 'Calibri' })
const normal      = (size = 11) => ({ size, name: 'Calibri' })
const fillSolid   = (argb)      => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const borderThin  = () => ({ style: 'thin', color: { argb: 'FFD0D0D0' } })
const allBorders  = () => ({ top: borderThin(), bottom: borderThin(), left: borderThin(), right: borderThin() })

function styleHeader(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font    = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFFFFFFF' } }
    cell.fill    = fillSolid('FF2D2D3F')
    cell.border  = allBorders()
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
  })
  row.height = 22
}

function styleItemRow(row, shade) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font      = normal()
    cell.fill      = fillSolid(shade ? 'FFF7F7FA' : 'FFFFFFFF')
    cell.border    = allBorders()
    cell.alignment = { vertical: 'middle', wrapText: false }
  })
  // alinear números a la derecha
  ;[3, 4, 5, 6, 7].forEach(c => {
    row.getCell(c).alignment = { vertical: 'middle', horizontal: 'right' }
  })
  row.height = 18
}

function styleSummaryRow(row, isBold = false) {
  const labelCell = row.getCell(7)
  const valueCell = row.getCell(8)
  labelCell.font      = isBold ? bold() : normal()
  labelCell.fill      = fillSolid('FFF2F2F7')
  labelCell.border    = allBorders()
  labelCell.alignment = { horizontal: 'left', vertical: 'middle' }
  valueCell.font      = isBold ? bold() : normal()
  valueCell.fill      = fillSolid(isBold ? 'FFE8F5E9' : 'FFF2F2F7')
  valueCell.border    = allBorders()
  valueCell.alignment = { horizontal: 'right', vertical: 'middle' }
  row.height = 18
}

// ── exportación principal ──────────────────────────────────────────────────
export async function exportarPresupuestoExcel(presupuesto) {
  const {
    numero, cliente_nombre, cliente_empresa, cliente_email, cliente_telefono,
    nombre_proyecto, tipo_proyecto, moneda = 'CLP', estado,
    fecha_emision, validez_dias,
    descuento = 0, impuesto = 0,
    ajuste_total, ajuste_motivo,
    notas,
    items = [],
  } = presupuesto

  const fmt = (n) => parseFloat(n) || 0

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Onyria Presupuestos'
  const ws = wb.addWorksheet('Presupuesto')

  // ── Anchos de columna ──────────────────────────────────────────────────
  ws.columns = [
    { width: 22 }, // A
    { width: 38 }, // B
    { width: 10 }, // C
    { width: 20 }, // D
    { width: 10 }, // E
    { width: 22 }, // F
    { width: 22 }, // G
    { width: 36 }, // H
  ]

  // ── Fila 1: Título ─────────────────────────────────────────────────────
  const titleRow = ws.addRow([`PRESUPUESTO ${numero || ''}`])
  ws.mergeCells('A1:H1')
  titleRow.getCell(1).font      = { bold: true, size: 14, name: 'Calibri' }
  titleRow.getCell(1).fill      = fillSolid('FFFFFFFF')
  titleRow.getCell(1).alignment = { vertical: 'middle' }
  titleRow.height = 28

  // ── Fila 2: vacía ──────────────────────────────────────────────────────
  ws.addRow([])

  // ── Filas 3–7: Datos del presupuesto ───────────────────────────────────
  const meta = [
    ['Cliente',  cliente_nombre   || '', 'Empresa',  cliente_empresa  || ''],
    ['Email',    cliente_email    || '', 'Teléfono', cliente_telefono || ''],
    ['Proyecto', nombre_proyecto  || '', 'Tipo',     CAT_LABEL[tipo_proyecto] || tipo_proyecto || ''],
    ['Fecha',    fecha_emision?.split('T')[0] || '', 'Validez', `${validez_dias || 30} días`],
    ['Moneda',   moneda, 'Estado', estado || ''],
  ]

  for (const [l1, v1, l2, v2] of meta) {
    const row = ws.addRow([l1, v1, '', l2, v2])
    row.getCell(1).font = bold()
    row.getCell(4).font = bold()
    row.height = 17
  }

  // ── Fila 8: vacía ──────────────────────────────────────────────────────
  ws.addRow([])

  // ── Fila 9: Encabezados de ítems ───────────────────────────────────────
  const headerRow = ws.addRow([
    'Categoría', 'Descripción', 'Cantidad', 'Precio Unitario',
    '% Boleta', `Precio c/Boleta (${moneda})`, `Subtotal (${moneda})`, 'Notas',
  ])
  styleHeader(headerRow)

  // ── Filas de ítems ─────────────────────────────────────────────────────
  let subtotalSum = 0
  items.forEach((item, idx) => {
    const precioUnitario   = fmt(item.precio_unitario)
    const porcentajeBoleta = fmt(item.porcentaje_boleta)
    const precioCon        = precioUnitario * (1 + porcentajeBoleta / 100)
    const subtotalItem     = fmt(item.cantidad) * precioCon
    subtotalSum += subtotalItem

    const row = ws.addRow([
      CAT_LABEL[item.categoria] || item.categoria || '',
      item.descripcion_personalizada || '',
      fmt(item.cantidad),
      precioUnitario,
      porcentajeBoleta,
      +precioCon.toFixed(2),
      +subtotalItem.toFixed(2),
      item.notas || '',
    ])
    styleItemRow(row, idx % 2 === 1)
  })

  // ── Fila vacía ─────────────────────────────────────────────────────────
  ws.addRow([])

  // ── Resumen financiero ─────────────────────────────────────────────────
  const descPct        = fmt(descuento)
  const descMonto      = subtotalSum * (descPct / 100)
  const baseImpon      = subtotalSum - descMonto
  const ivaMonto       = fmt(impuesto)
  const ivaPct         = baseImpon > 0 ? Math.round((ivaMonto / baseImpon) * 100) : 0
  const totalCalculado = baseImpon + ivaMonto

  const addSummary = (label, value, isBold = false) => {
    const row = ws.addRow(['', '', '', '', '', '', label, +value.toFixed(2)])
    styleSummaryRow(row, isBold)
  }

  addSummary(`Subtotal (${moneda})`,        subtotalSum)
  if (descPct > 0) {
    addSummary(`Descuento (${descPct}%)`,   -descMonto)
    addSummary(`Base Imponible (${moneda})`, baseImpon)
  }
  addSummary(`IVA (${ivaPct}%)`,            ivaMonto)
  addSummary(`TOTAL (${moneda})`,           totalCalculado, true)

  if (ajuste_total != null) {
    addSummary(`TOTAL AJUSTADO (${moneda})`, fmt(ajuste_total), true)
    if (ajuste_motivo) {
      ws.addRow([])
      const mRow = ws.addRow(['Motivo ajuste:', ajuste_motivo])
      mRow.getCell(1).font = bold()
    }
  }

  if (notas) {
    ws.addRow([])
    const nRow = ws.addRow(['Notas:', notas])
    nRow.getCell(1).font = bold()
  }

  // ── Descargar ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `presupuesto-${numero || 'exportar'}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
