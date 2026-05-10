const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template PDF Presupuesto.png')

const DEFAULT_CONDITIONS = [
  'Condiciones de pago: 30 a 60 días desde la facturación.',
  'Una vez aprobada esta cotización, se deberá enviar Orden de Compra para empezar la producción.',
  'Se permitirá solo dos cambios por armado por motivos de cambios de guión, o texto.',
  'La cantidad de producción o servicios asociada a presupuestos que se consideren paquete o fee mensual tienen un plazo para realizar dicha producción dentro de los días hábiles del mismo mes.',
  'No está autorizado el uso parcial o total de este material en otras piezas comerciales u otros medios de difusión.',
  'Todos los trabajos consideran derechos por 12 meses, salvo que se especifique algo distinto en el detalle de la cotización.',
]

function fmtMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `$${Math.round(n).toLocaleString('es-CL')}`
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function buildHTML(p, templateBase64) {
  const moneda   = p.moneda || 'CLP'
  const descPct  = parseFloat(p.descuento) || 0
  const subtotal = parseFloat(p.subtotal) || 0
  const descMonto = subtotal * (descPct / 100)
  const baseImpon = subtotal - descMonto
  const ivaMonto  = parseFloat(p.impuesto) || 0
  const totalFinal = p.ajuste_total != null ? parseFloat(p.ajuste_total) : parseFloat(p.total) || 0

  const fecha = p.fecha_emision
    ? new Date(p.fecha_emision).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const items = p.items || []
  const detalleHTML = items.map(i =>
    `<li>${i.descripcion_personalizada || i.descripcion || '—'}</li>`
  ).join('')

  const obsLines = p.notas
    ? p.notas.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('')
    : ''

  const pageHeight = 297 // mm A4
  const pageWidth = 210

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${p.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
    }
    .page {
      width: ${pageWidth}mm;
      height: ${pageHeight}mm;
      position: relative;
      overflow: hidden;
      background-image: url('${templateBase64}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    .overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .header-data {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 12mm 15mm 0;
      gap: 20mm;
      font-size: 10px;
      line-height: 1.4;
    }
    .header-left { color: #333; }
    .header-right { text-align: right; color: #333; }
    .header-label { font-weight: 600; color: #666; font-size: 9px; }

    .numero-fecha {
      position: absolute;
      top: 15mm;
      right: 15mm;
      text-align: right;
      font-size: 11px;
      line-height: 1.5;
      color: #333;
    }
    .numero { font-weight: 700; font-size: 12px; }

    .proyecto {
      position: absolute;
      top: 35mm;
      left: 15mm;
      font-size: 10px;
      line-height: 1.5;
      color: #333;
    }
    .proyecto-label { font-weight: 600; color: #666; font-size: 9px; }

    .detalle {
      position: absolute;
      top: 50mm;
      left: 15mm;
      right: 15mm;
      width: calc(100% - 30mm);
      font-size: 9px;
      line-height: 1.3;
      color: #333;
    }
    .detalle ul {
      list-style: none;
      padding-left: 5mm;
    }
    .detalle li { margin-bottom: 2mm; }
    .detalle li:before { content: "• "; margin-right: 3mm; }

    .totales {
      position: absolute;
      top: 110mm;
      right: 15mm;
      width: 60mm;
      text-align: right;
      font-size: 10px;
      line-height: 2;
      color: #333;
    }
    .total-label { font-weight: 600; color: #666; font-size: 9px; }
    .total-amount { font-weight: 700; color: #0D0E1C; }

    .observaciones {
      position: absolute;
      bottom: 40mm;
      left: 15mm;
      right: 15mm;
      width: calc(100% - 30mm);
      font-size: 9px;
      line-height: 1.3;
      color: #333;
    }
    .observaciones-label { font-weight: 600; color: #666; font-size: 9px; margin-bottom: 2mm; }
    .observaciones ul {
      list-style: none;
      padding-left: 5mm;
    }
    .observaciones li { margin-bottom: 1.5mm; }
    .observaciones li:before { content: "• "; margin-right: 3mm; }

    .footer {
      position: absolute;
      bottom: 5mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8px;
      color: #999;
      padding: 0 15mm;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="overlay">
      <div class="header-data">
        <div class="header-left">
          <div class="header-label">PARA:</div>
          <div style="font-weight: 600;">${p.cliente_nombre || '—'}</div>
          ${p.cliente_empresa ? `<div>${p.cliente_empresa}</div>` : ''}
          ${p.cliente_email ? `<div>${p.cliente_email}</div>` : ''}
        </div>
        <div class="header-right">
          <div class="numero">N° ${p.numero}</div>
          <div>${fecha}</div>
        </div>
      </div>

      <div class="numero-fecha"></div>

      <div class="proyecto">
        <div class="proyecto-label">PROYECTO:</div>
        <div style="font-weight: 600; margin-top: 2mm;">${p.nombre_proyecto || '—'}</div>
        ${p.tipo_proyecto ? `<div style="color: #666; font-size: 9px; margin-top: 1mm;">${p.tipo_proyecto}</div>` : ''}
      </div>

      <div class="detalle">
        <div style="font-weight: 600; margin-bottom: 3mm; color: #666; font-size: 9px;">DETALLE:</div>
        <ul>${detalleHTML || '<li>Sin ítems</li>'}</ul>
      </div>

      <div class="totales">
        <div class="total-label">Subtotal</div>
        <div>${fmtMonto(subtotal, moneda)}</div>
        ${descPct > 0 ? `
          <div style="border-top: 1px solid #ddd; padding-top: 2mm; margin-top: 2mm;">
            <div class="total-label">Descuento (${descPct}%)</div>
            <div>- ${fmtMonto(descMonto, moneda)}</div>
            <div class="total-label" style="margin-top: 2mm;">Neto</div>
            <div>${fmtMonto(baseImpon, moneda)}</div>
          </div>
        ` : ''}
        <div style="border-top: 1px solid #ddd; padding-top: 2mm; margin-top: 2mm;">
          <div class="total-label">IVA (19%)</div>
          <div>${fmtMonto(ivaMonto, moneda)}</div>
          <div class="total-label" style="margin-top: 3mm; font-size: 10px;">TOTAL</div>
          <div class="total-amount" style="font-size: 14px;">${fmtMonto(totalFinal, moneda)}</div>
        </div>
      </div>

      ${obsLines ? `
        <div class="observaciones">
          <div class="observaciones-label">OBSERVACIONES:</div>
          <ul>${obsLines}</ul>
        </div>
      ` : ''}

      <div class="footer">
        www.onyria-studio.cl
      </div>
    </div>
  </div>
</body>
</html>`
}

async function generarPDF(presupuesto) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('Template PDF no encontrado: ' + TEMPLATE_PATH)
  }

  // Leer PNG y convertir a base64
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
    await page.setViewport({ width: 794, height: 1123 }) // A4 at 96dpi

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    })

    return pdf
  } finally {
    await browser.close()
  }
}

module.exports = { generarPDF }
