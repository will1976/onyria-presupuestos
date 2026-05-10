const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template PDF Presupuesto.png')

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

  const items = p.items || []
  const detalleHTML = items.map(i => {
    const desc = i.descripcion_personalizada || i.descripcion || '—'
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
    body { font-family: 'DM Sans', Arial, sans-serif; color: #0D0E1C; }
    .page {
      width: 210mm;
      height: 297mm;
      background: url('${templateBase64}') no-repeat center / 210mm 297mm;
      position: relative;
      overflow: hidden;
    }
    .abs { position: absolute; }
    .bold { font-weight: 700; }

    /* Bloque Para */
    .cliente   { left: 33mm; top: 41mm; font-size: 10pt; font-weight: 700; width: 95mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mail-c    { left: 33mm; top: 47mm; font-size: 10pt; width: 95mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .de        { left: 33mm; top: 53mm; font-size: 10pt; font-weight: 700; }
    .mail-d    { left: 33mm; top: 59mm; font-size: 10pt; }

    /* Número y fecha */
    .num-bloque { left: 135mm; top: 41mm; width: 60mm; }
    .num-bloque .lbl   { font-size: 9pt; color: #666; }
    .num-bloque .num   { font-weight: 700; font-size: 11pt; }
    .num-bloque .fecha { font-size: 9pt; color: #666; margin-top: 2px; }
    .num-bloque .val   { font-size: 8pt; color: #888; }

    /* Proyecto */
    .proyecto      { left: 33mm; top: 75mm; font-size: 10.5pt; font-weight: 700; width: 160mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .proyecto-tipo { left: 33mm; top: 80mm; font-size: 9pt; color: #555; }

    /* Detalle */
    .detalle { left: 18mm; top: 92mm; width: 174mm; max-height: 60mm; overflow: hidden; }
    .item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 9pt;
      line-height: 1.5;
      padding-bottom: 1px;
    }
    .item-desc { flex: 1; min-width: 0; }
    .item-desc .qty { color: #888; }
    .item-amount { color: #444; white-space: nowrap; }

    /* Totales (alineado al $ del template) */
    .totales      { left: 140mm; top: 162mm; width: 55mm; text-align: right; }
    .total-neto   { font-size: 10pt; line-height: 1.85; font-weight: 600; }
    .total-iva    { font-size: 10pt; line-height: 1.85; font-weight: 600; }
    .total-grand  { font-size: 11pt; line-height: 1.85; font-weight: 700; }

    /* Motivo de ajuste */
    .ajuste-motivo { left: 18mm; top: 187mm; width: 174mm; font-size: 8pt; color: #666; font-style: italic; }
  </style>
</head>
<body>
  <div class="page">
    <div class="abs cliente">${p.cliente_nombre || ''}</div>
    <div class="abs mail-c">${p.cliente_email || ''}</div>
    <div class="abs de">Onyria Studio</div>
    <div class="abs mail-d">contacto@onyria-studio.cl</div>

    <div class="abs num-bloque">
      <div class="lbl">N° Cotización</div>
      <div class="num">${p.numero}</div>
      <div class="fecha">Fecha: ${fecha}</div>
      <div class="val">Validez: ${p.validez_dias || 30} días</div>
    </div>

    <div class="abs proyecto">${p.nombre_proyecto || ''}</div>
    ${p.tipo_proyecto ? `<div class="abs proyecto-tipo">${p.tipo_proyecto.replace(/_/g, ' ')}</div>` : ''}

    <div class="abs detalle">${detalleHTML}</div>

    <div class="abs totales">
      <div class="total-neto">${fmtMonto(baseImpon, moneda)}</div>
      <div class="total-iva">${fmtMonto(ivaMonto, moneda)}</div>
      <div class="total-grand">${fmtMonto(totalFinal, moneda)}</div>
    </div>

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
