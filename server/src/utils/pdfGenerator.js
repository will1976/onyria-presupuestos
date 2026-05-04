const puppeteer = require('puppeteer')
const path      = require('path')
const fs        = require('fs')

const PUBLIC_DIR = path.join(__dirname, '../../../client/public')

function loadImage(filename, mime = 'image/png') {
  try {
    const buf = fs.readFileSync(path.join(PUBLIC_DIR, filename))
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (_) {
    return ''
  }
}

const INICIO_URI = loadImage('inicio.png')
const FINAL_URI  = loadImage('final.png')
const LOGO_URI   = loadImage('logo.png')

const DEFAULT_CONDITIONS = [
  'Condiciones de pago: 30 a 60 días desde la facturación.',
  'Una vez aprobada esta cotización, se deberá enviar Orden de Compra para empezar la producción.',
  'Se permitirá solo dos cambios por armado por motivos de cambios de guión, o texto.',
  'La cantidad de producción o servicios asociada a presupuestos que se consideren paquete o fee mensual tienen un plazo para realizar dicha producción dentro de los días hábiles del mismo mes, por lo que no son acumulables.',
  'No está autorizado el uso parcial o total de este material en otras piezas comerciales u otros medios de difusión, que no se especifique en esta cotización.',
  'Todos los trabajos consideran derechos por 12 meses, salvo que se especifique algo distinto en el detalle de la cotización.',
  'Los trabajos en producción o terminados, tienen un plazo activo de un máximo de 1 mes desde su fecha de inicio. Cualquier cambio posterior a ese plazo de tiempo, queda afecto a un costo adicional.',
  'El inicio de los derechos que contempla cada pieza comienzan a regir desde el momento que se entrega el final, a menos que ambas partes acuerden lo contrario.',
]

function formatMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `$${Math.round(n).toLocaleString('es-CL')}`
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function buildHTML(presupuesto) {
  const {
    numero, cliente_nombre, cliente_empresa, cliente_email,
    nombre_proyecto,
    moneda = 'CLP',
    descuento = 0, impuesto = 0, subtotal = 0, total = 0,
    ajuste_total, notas,
    items = [],
  } = presupuesto

  const fecha = presupuesto.fecha_emision
    ? new Date(presupuesto.fecha_emision).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const descPct   = parseFloat(descuento) || 0
  const descMonto = parseFloat(subtotal) * (descPct / 100)
  const baseImpon = parseFloat(subtotal) - descMonto
  const ivaMonto  = parseFloat(impuesto) || 0
  const totalFinal = ajuste_total != null ? parseFloat(ajuste_total) : parseFloat(total)

  // Detalle: bullet list of service names only (no prices — client-facing)
  const detalleItems = items.map(item =>
    `<li>${item.descripcion_personalizada || item.descripcion || '—'}</li>`
  ).join('\n')

  // Condiciones
  const condLines = presupuesto.condiciones
    ? presupuesto.condiciones.split('\n').filter(l => l.trim())
    : DEFAULT_CONDITIONS
  const condHTML = condLines.map(l => `<li>${l.trim()}</li>`).join('\n')

  // Observaciones
  const obsLines = notas
    ? notas.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('\n')
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
      color: #1A1A2E;
      background: #FFF;
      font-size: 11px;
      line-height: 1.6;
    }

    /* ── HEADER ─────────────────────────────────────────────────── */
    .page-header {
      position: relative;
      width: 100%;
    }
    .page-header img.bg {
      width: 100%;
      display: block;
    }
    .header-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      padding: 0 40px;
    }
    .header-logo img {
      height: 52px;
      object-fit: contain;
    }
    .header-title {
      flex: 1;
      text-align: center;
      color: #FFFFFF;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .header-numdate {
      text-align: right;
      color: #FFFFFF;
      font-size: 11px;
      line-height: 1.5;
    }
    .header-numdate .num {
      font-weight: 700;
      font-size: 13px;
    }

    /* ── CONTENT ─────────────────────────────────────────────────── */
    .content {
      padding: 28px 44px 20px;
    }

    /* Client / sender info */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 22px;
    }
    .info-row {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .info-label {
      color: #555;
      min-width: 48px;
      flex-shrink: 0;
    }
    .info-value {
      font-weight: 700;
      color: #1A1A2E;
    }

    /* Section headings with underline bar */
    .section-heading {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1A1A2E;
      padding-bottom: 6px;
      border-bottom: 3px solid #1A1A2E;
      margin-bottom: 12px;
      margin-top: 20px;
    }

    /* Bullet detalle */
    .detalle-list {
      list-style: none;
      padding: 0;
      margin: 0 0 10px;
    }
    .detalle-list li {
      padding: 3px 0 3px 16px;
      position: relative;
      font-size: 11px;
      color: #1A1A2E;
    }
    .detalle-list li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #1A1A2E;
      font-weight: 700;
    }

    /* Financial summary */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
      margin-bottom: 24px;
    }
    .totals-box {
      width: 260px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 11px;
      border-bottom: 1px solid #E5E0D8;
    }
    .total-row .label { color: #555; }
    .total-final {
      display: flex;
      justify-content: space-between;
      padding: 10px 0 4px;
      font-size: 15px;
      font-weight: 800;
      color: #1A1A2E;
      border-top: 2px solid #1A1A2E;
    }

    /* Dark-header sections (Observaciones, Forma de Pago) */
    .dark-section {
      margin-bottom: 18px;
    }
    .dark-header {
      background: #1A1A2E;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 7px 16px;
      border-radius: 3px 3px 0 0;
    }
    .dark-body {
      background: #F5F5F8;
      padding: 12px 16px;
      border-radius: 0 0 3px 3px;
    }
    .dark-body ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .dark-body ul li {
      padding: 2px 0 2px 16px;
      position: relative;
      font-size: 10.5px;
      color: #333;
      line-height: 1.55;
    }
    .dark-body ul li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #1A1A2E;
    }
    .pago-lead {
      font-weight: 700;
      font-size: 12px;
      color: #1A1A2E;
      margin-bottom: 6px;
    }

    /* Company & bank info */
    .company-info {
      text-align: center;
      font-size: 10px;
      color: #555;
      margin-bottom: 4px;
      line-height: 1.7;
    }
    .company-info strong {
      color: #1A1A2E;
      font-weight: 700;
    }
    .bank-info {
      text-align: center;
      font-size: 10px;
      color: #555;
      margin-bottom: 18px;
    }

    /* ── FOOTER ─────────────────────────────────────────────────── */
    .page-footer {
      width: 100%;
      margin-top: 10px;
    }
    .page-footer img {
      width: 100%;
      display: block;
    }

    .discount { color: #CC0000; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="page-header">
    ${INICIO_URI ? `<img class="bg" src="${INICIO_URI}" alt="">` : '<div style="height:110px;background:#1A1A2E;"></div>'}
    <div class="header-overlay">
      <div class="header-logo">
        ${LOGO_URI ? `<img src="${LOGO_URI}" alt="Onyria Studio">` : '<span style="color:#fff;font-weight:800;font-size:18px;">ONYRIA</span>'}
      </div>
      <div class="header-title">Cotización</div>
      <div class="header-numdate">
        <div class="num">N° ${numero || '—'}</div>
        <div>${fecha}</div>
      </div>
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content">

    <!-- Para / De -->
    <div class="info-grid">
      <div>
        <div class="info-row"><span class="info-label">Para:</span><span class="info-value">${cliente_nombre || '—'}</span></div>
        ${cliente_empresa ? `<div class="info-row"><span class="info-label">Empresa:</span><span class="info-value">${cliente_empresa}</span></div>` : ''}
        ${cliente_email   ? `<div class="info-row"><span class="info-label">Mail:</span><span class="info-value">${cliente_email}</span></div>`   : ''}
      </div>
      <div>
        <div class="info-row"><span class="info-label">De:</span><span class="info-value">Carolina Zepeda</span></div>
        <div class="info-row"><span class="info-label">Mail:</span><span class="info-value">carolina@onyria-studio.cl</span></div>
      </div>
    </div>

    <!-- Proyecto -->
    <div class="section-heading">Proyecto</div>
    <p style="font-weight:700;font-size:12px;margin-bottom:6px;">${nombre_proyecto || '—'}</p>

    <!-- Detalle -->
    <div class="section-heading">Detalle</div>
    <ul class="detalle-list">
      ${detalleItems || '<li>Sin ítems</li>'}
    </ul>

    <!-- Totales -->
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="total-row">
          <span class="label">Total Neto:</span>
          <span>${formatMonto(baseImpon, moneda)}</span>
        </div>
        ${descPct > 0 ? `
        <div class="total-row">
          <span class="label">Descuento (${descPct}%):</span>
          <span class="discount">- ${formatMonto(descMonto, moneda)}</span>
        </div>` : ''}
        <div class="total-row">
          <span class="label">IVA (19%):</span>
          <span>${formatMonto(ivaMonto, moneda)}</span>
        </div>
        <div class="total-final">
          <span>TOTAL:</span>
          <span>${formatMonto(totalFinal, moneda)}</span>
        </div>
      </div>
    </div>

    <!-- Observaciones -->
    ${obsLines ? `
    <div class="dark-section">
      <div class="dark-header">Observaciones</div>
      <div class="dark-body">
        <ul>${obsLines}</ul>
      </div>
    </div>` : ''}

    <!-- Forma de Pago -->
    <div class="dark-section">
      <div class="dark-header">Forma de Pago</div>
      <div class="dark-body">
        <div class="pago-lead">30 a 60 días</div>
        <ul>${condHTML}</ul>
      </div>
    </div>

    <!-- Empresa -->
    <div class="company-info">
      <strong>Onyria Studio SpA</strong>&nbsp;&nbsp;·&nbsp;&nbsp;Rut: 77.946.076-2&nbsp;&nbsp;·&nbsp;&nbsp;Dirección: Santa Magdalena 75 of 304, Providencia
    </div>
    <div class="bank-info">
      Banco Santander &ndash; Cta corriente N° 0-000-9632329-8&nbsp;&nbsp;·&nbsp;&nbsp;Correo: carolina@onyria-studio.cl
    </div>

  </div><!-- /content -->

  <!-- FOOTER -->
  ${FINAL_URI ? `
  <div class="page-footer">
    <img src="${FINAL_URI}" alt="">
  </div>` : ''}

</body>
</html>`
}

async function generarPDF(presupuesto) {
  let browser
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(buildHTML(presupuesto), { waitUntil: 'domcontentloaded' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    return pdfBuffer
  } finally {
    if (browser) await browser.close()
  }
}

module.exports = { generarPDF }
