import * as XLSX from 'xlsx'
import { CATEGORIAS } from '../components/theme'

const CAT_LABEL = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.label]))

export function exportarPresupuestoExcel(presupuesto) {
  const {
    numero, cliente_nombre, cliente_empresa, cliente_email, cliente_telefono,
    nombre_proyecto, tipo_proyecto, moneda = 'CLP', estado,
    fecha_emision, validez_dias,
    descuento = 0, impuesto = 0, total = 0,
    ajuste_total, ajuste_motivo,
    notas,
    items = [],
  } = presupuesto

  const fmt = (n) => parseFloat(n) || 0
  const rows = []

  // ── Encabezado del presupuesto ──────────────────────────────────────────
  rows.push([`PRESUPUESTO ${numero || ''}`, '', '', '', '', '', '', ''])
  rows.push([])
  rows.push(['Cliente',  cliente_nombre   || '', '', 'Empresa',  cliente_empresa  || '', '', '', ''])
  rows.push(['Email',    cliente_email    || '', '', 'Teléfono', cliente_telefono || '', '', '', ''])
  rows.push(['Proyecto', nombre_proyecto  || '', '', 'Tipo',     CAT_LABEL[tipo_proyecto] || tipo_proyecto || '', '', '', ''])
  rows.push(['Fecha',    fecha_emision?.split('T')[0] || '', '', 'Validez', `${validez_dias || 30} días`, '', '', ''])
  rows.push(['Moneda',   moneda, '', 'Estado', estado || '', '', '', ''])
  rows.push([])

  // ── Encabezados de ítems ────────────────────────────────────────────────
  rows.push(['Categoría', 'Descripción', 'Cantidad', 'Precio Unitario', '% Boleta', `Precio c/Boleta (${moneda})`, `Subtotal (${moneda})`, 'Notas'])

  // ── Filas de ítems ──────────────────────────────────────────────────────
  let subtotalSum = 0
  for (const item of items) {
    const precioUnitario  = fmt(item.precio_unitario)
    const porcentajeBoleta = fmt(item.porcentaje_boleta)
    const precioCon       = precioUnitario * (1 + porcentajeBoleta / 100)
    const subtotalItem    = fmt(item.cantidad) * precioCon
    subtotalSum += subtotalItem

    rows.push([
      CAT_LABEL[item.categoria] || item.categoria || '',
      item.descripcion_personalizada || '',
      fmt(item.cantidad),
      precioUnitario,
      porcentajeBoleta,
      +precioCon.toFixed(2),
      +subtotalItem.toFixed(2),
      item.notas || '',
    ])
  }

  // ── Resumen financiero ──────────────────────────────────────────────────
  const descPct    = fmt(descuento)
  const descMonto  = subtotalSum * (descPct / 100)
  const baseImpon  = subtotalSum - descMonto
  const ivaMonto   = fmt(impuesto)
  const ivaPct     = baseImpon > 0 ? Math.round((ivaMonto / baseImpon) * 100) : 0
  const totalFinal = ajuste_total != null ? fmt(ajuste_total) : fmt(total)

  const pad = ['', '', '', '', '', '']
  rows.push([])
  rows.push([...pad, `Subtotal (${moneda})`,         +subtotalSum.toFixed(2)])
  if (descPct > 0) {
    rows.push([...pad, `Descuento (${descPct}%)`,    +(-descMonto).toFixed(2)])
    rows.push([...pad, `Base Imponible (${moneda})`, +baseImpon.toFixed(2)])
  }
  rows.push([...pad, `IVA (${ivaPct}%)`,             +ivaMonto.toFixed(2)])
  rows.push([...pad, `TOTAL (${moneda})`,             +totalFinal.toFixed(2)])

  if (ajuste_total != null && ajuste_motivo) {
    rows.push([])
    rows.push(['Ajuste manual:', ajuste_motivo])
  }
  if (notas) {
    rows.push([])
    rows.push(['Notas:', notas])
  }

  // ── Crear hoja y workbook ───────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 18 }, { wch: 38 }, { wch: 10 }, { wch: 18 },
    { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 32 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto')
  XLSX.writeFile(wb, `presupuesto-${numero || 'exportar'}.xlsx`)
}
