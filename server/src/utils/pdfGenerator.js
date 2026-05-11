const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template PDF Presupuesto.png')

// Formato sin "$" porque el template ya trae "$" al final de cada label
function fmtNum(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `${Math.round(n).toLocaleString('es-CL')} CLP`
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
}

// Formato con "$" para los items del detalle
function fmtMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `$${Math.round(n).toLocaleString('es-CL')}`
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function buildHTML(p, templateBase64) {
  const moneda    = p.moneda || 'CLP'
  const subtotal  = parseFloat(p.subtotal) || 0
  const descPct   = parseFloat(p.descuento) || 0
  const descMonto = subtotal * (descPct / 100)
  const baseImpon = subtotal - descMonto
  const ivaMonto  = parseFloat(p.impuesto) || 0
  const totalFinal = p.ajuste_total != null ? parseFloat(p.ajuste_total) : (parseFloat(p.total) || 0)

  const fecha = p.fecha_emision
    ? new Date(p.fecha_emision).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const items = (p.items || []).filter(i => (i.descripcion_personalizada || i.descripcion))
  const detalleHTML = items.map(i => {
    const desc = i.descripcion_personalizada || i.descripcion
    const cant = parseFloat(i.cantidad) || 1
    const sub  = parseFloat(i.subtotal) || (cant * (parseFloat(i.precio_unitario) || 0))
    return `
      <div class="item-row">
        <div class="item-desc">• ${desc}${cant > 1 ? `<span class="qty"> × ${cant}</span>` : ''}</div>
        <div class="item-amount">${fmtMonto(sub, moneda)}</div>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${p.numero}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', Arial, sans-serif; color: #0D0E1C; font-size: 9pt; }
    .page {
      width: 210mm;
      height: 297mm;
      background: url('${templateBase64}') no-repeat center / 210mm 297mm;
      position: relative;
      overflow: hidden;
    }
    .abs { position: absolute; }
    .ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Bloque Para — spacing 4mm */
    .cliente   { left: 33mm; top: 39mm; font-weight: 700; width: 95mm; }
    .mail-c    { left: 33mm; top: 43mm; width: 95mm; }
    .de        { left: 33mm; top: 47mm; font-weight: 700; }
    .mail-d    { left: 33mm; top: 51mm; }

    /* Número y fecha (top-right) */
    .num-bloque { left: 135mm; top: 39mm; width: 60mm; }
    .num-bloque .lbl   { font-size: 8pt; color: #666; }
    .num-bloque .num   { font-weight: 700; font-size: 11pt; }
    .num-bloque .fecha { font-size: 8pt; color: #666; margin-top: 2px; }
    .num-bloque .val   { font-size: 8pt; color: #888; }

    /* Proyecto */
    .proyecto      { left: 33mm; top: 60mm; font-size: 10pt; font-weight: 700; width: 160mm; }
    .proyecto-tipo { left: 33mm; top: 65mm; font-size: 8pt; color: #555; }

    /* Detalle */
    .detalle { left: 18mm; top: 73mm; width: 174mm; max-height: 65mm; overflow: hidden; }
    .item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 9pt;
      line-height: 1.4;
      padding-bottom: 1px;
    }
    .item-desc { flex: 1; min-width: 0; }
    .item-desc .qty { color: #888; }
    .item-amount { color: #444; white-space: nowrap; }

    /* Totales (lado derecho, alineados al $ del template) */
    .tot-neto  { left: 155mm; top: 144mm; width: 40mm; text-align: right; font-size: 9pt; font-weight: 600; }
    .tot-iva   { left: 155mm; top: 151mm; width: 40mm; text-align: right; font-size: 9pt; font-weight: 600; }
    .tot-final { left: 155mm; top: 158mm; width: 40mm; text-align: right; font-size: 10pt; font-weight: 700; }

    /* Motivo de ajuste */
    .ajuste-motivo { left: 18mm; top: 167mm; width: 130mm; font-size: 7.5pt; color: #666; font-style: italic; }
  </style>
</head>
<body>
  <div class="page">
    <div class="abs cliente ellipsis">${p.cliente_nombre || ''}</div>
    <div class="abs mail-c ellipsis">${p.cliente_email || ''}</div>
    <div class="abs de">Onyria Studio</div>
    <div class="abs mail-d">contacto@onyria-studio.cl</div>

    <div class="abs num-bloque">
      <div class="lbl">N° Cotización</div>
      <div class="num">${p.numero}</div>
      <div class="fecha">Fecha: ${fecha}</div>
      <div class="val">Validez: ${p.validez_dias || 30} días</div>
    </div>

    <div class="abs proyecto ellipsis">${p.nombre_proyecto || ''}</div>
    ${p.tipo_proyecto ? `<div class="abs proyecto-tipo">${p.tipo_proyecto.replace(/_/g, ' ')}</div>` : ''}

    <div class="abs detalle">${detalleHTML}</div>

    <div class="abs tot-neto">${fmtNum(baseImpon, moneda)}</div>
    <div class="abs tot-iva">${fmtNum(ivaMonto, moneda)}</div>
    <div class="abs tot-final">${fmtNum(totalFinal, moneda)}</div>

    ${p.ajuste_motivo ? `<div class="abs ajuste-motivo">Ajuste de total: ${p.ajuste_motivo}</div>` : ''}
  </div>
</body>
</html>`
}

async function generarPDF(presupuesto) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('Template PDF no encontrado: ' + TEMPLATE_PATH)
  }

  const pngBuffer = fs.readFileSync(TEMPLATE_PATH)
  const templateBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`

  const html = buildHTML(presupuesto, templateBase64)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle2' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      preferCSSPageSize: true,
    })

    return pdf
  } finally {
    await browser.close()
  }
}

module.exports = { generarPDF }
