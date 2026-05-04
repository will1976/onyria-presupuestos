const puppeteer = require('puppeteer')

const DEFAULT_CONDITIONS = [
  'Condiciones de pago: 30 a 60 días desde la facturación.',
  'Una vez aprobada esta cotización, se deberá enviar Orden de Compra para empezar la producción.',
  'Se permitirá solo dos cambios por armado por motivos de cambios de guión, o texto. (Las correcciones de guión por exceso de duración de la pieza, serán consideradas como cambio).',
  'La cantidad de producción o servicios asociada a presupuestos que se consideren paquete o fee mensual tienen un plazo para realizar dicha producción dentro de los días hábiles del mismo mes, por lo que no son acumulables.',
  'No está autorizado el uso parcial o total de este material en otras piezas comerciales u otros medios de difusión, que no se especifique en esta cotización.',
  'Todos los trabajos consideran derechos por 12 meses, salvo que se especifique algo distinto en el detalle de la cotización.',
  'Los trabajos en producción o terminados, tienen un plazo activo de un máximo de 1 mes desde su fecha de inicio. Cualquier cambio posterior a ese plazo de tiempo, queda afecto a un costo adicional. Así mismo, la publicación o salida al aire de una pieza considera el trabajo como finalizado.',
  'El inicio de los derechos que contempla cada pieza comienzan a regir desde el momento que se entrega el final, a menos que ambas partes acuerden lo contrario.',
]

function fmtMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `$${Math.round(n).toLocaleString('es-CL')}`
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function buildHTML(p) {
  const moneda   = p.moneda || 'CLP'
  const descPct  = parseFloat(p.descuento) || 0
  const subtotal = parseFloat(p.subtotal)  || 0
  const descMonto = subtotal * (descPct / 100)
  const baseImpon = subtotal - descMonto
  const ivaMonto  = parseFloat(p.impuesto) || 0
  const totalFinal = p.ajuste_total != null ? parseFloat(p.ajuste_total) : parseFloat(p.total) || 0

  const fecha = p.fecha_emision
    ? new Date(p.fecha_emision).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const items = p.items || []

  const detalleHTML = items.length
    ? items.map(i => `<li>${i.descripcion_personalizada || i.descripcion || '—'}</li>`).join('')
    : '<li>Sin ítems</li>'

  const condLines = p.condiciones
    ? p.condiciones.split('\n').filter(l => l.trim())
    : DEFAULT_CONDITIONS
  const condHTML = condLines.map(l => `<li>${l.trim()}</li>`).join('')

  const obsLines = p.notas
    ? p.notas.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('')
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #1A1A2E;
    background: #fff;
    font-size: 11px;
    line-height: 1.55;
  }

  /* ── HEADER ─────────────────────────────────────────────────────── */
  .hd {
    background: #0D0E1C;
    padding: 22px 40px;
    display: flex;
    align-items: center;
    gap: 0;
  }
  .hd-logo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    min-width: 140px;
  }
  .hd-logo .circle {
    width: 52px; height: 52px;
    border-radius: 50%;
    border: 3px solid #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 5px;
    background: transparent;
  }
  .hd-logo .circle-inner {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid #fff;
  }
  .hd-logo .brand {
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.12em;
    line-height: 1.15;
  }
  .hd-logo .sub {
    color: #fff;
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.25em;
    text-transform: uppercase;
  }
  .hd-center {
    flex: 1;
    text-align: center;
    color: #fff;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .hd-right {
    min-width: 140px;
    text-align: right;
    color: rgba(255,255,255,0.85);
    font-size: 10px;
    line-height: 1.6;
  }
  .hd-right .num { font-size: 12px; font-weight: 700; color: #fff; }

  /* ── CONTENT ─────────────────────────────────────────────────────── */
  .body { padding: 24px 44px 20px; }

  /* Para / De */
  .info-block { margin-bottom: 22px; }
  .info-row   { display: flex; gap: 8px; margin-bottom: 3px; }
  .info-lbl   { color: #444; font-size: 11px; min-width: 52px; }
  .info-val   { font-weight: 700; font-size: 11px; color: #1A1A2E; }

  /* Section headings */
  .sec-heading {
    font-size: 11px;
    font-weight: 700;
    color: #1A1A2E;
    border-bottom: 2px solid #1A1A2E;
    padding-bottom: 4px;
    margin: 18px 0 10px;
    text-decoration: none;
    letter-spacing: 0.02em;
  }

  /* Detalle bullets */
  ul.detalle {
    list-style: none; padding: 0; margin: 0 0 8px;
  }
  ul.detalle li {
    padding: 2px 0 2px 14px;
    position: relative;
    font-size: 11px;
    color: #1A1A2E;
  }
  ul.detalle li::before { content: '•'; position: absolute; left: 0; }

  /* Totals */
  .totals-wrap { display: flex; justify-content: flex-end; margin: 14px 0 22px; }
  .totals-box  { width: 240px; }
  .t-row {
    display: flex; justify-content: space-between;
    padding: 4px 0;
    font-size: 11px;
    border-bottom: 1px solid #E0DBD4;
  }
  .t-row .lbl { color: #555; }
  .t-final {
    display: flex; justify-content: space-between;
    padding: 9px 0 3px;
    font-size: 14px; font-weight: 800; color: #1A1A2E;
    border-top: 2px solid #1A1A2E;
    margin-top: 2px;
  }

  /* Dark-bar sections */
  .ds { margin-bottom: 14px; }
  .ds-head {
    background: #1A1A2E;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 5px 14px;
  }
  .ds-body {
    background: #F4F4F7;
    padding: 10px 14px 10px 24px;
  }
  .ds-body ul { list-style: disc; padding-left: 0; margin: 0; }
  .ds-body ul li { font-size: 10px; color: #333; line-height: 1.55; padding: 1px 0; }

  .pago-lead {
    font-size: 11px; font-weight: 700; color: #1A1A2E;
    margin-bottom: 6px;
  }

  /* Company / bank */
  .company-wrap { text-align: center; margin: 10px 0 6px; }
  .company-wrap p { font-size: 10px; color: #1A1A2E; line-height: 1.7; }
  .company-wrap strong { font-weight: 700; font-size: 11px; }

  .divider { height: 3px; background: #1A1A2E; margin: 10px 0; border-radius: 1px; }

  .bank-wrap { text-align: center; margin: 8px 0 14px; }
  .bank-wrap p { font-size: 10px; color: #444; line-height: 1.7; }

  /* ── FOOTER ─────────────────────────────────────────────────────── */
  .ft {
    background: #0D0E1C;
    padding: 16px 40px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 10px;
  }
  .ft-logo .circle {
    width: 38px; height: 38px;
    border-radius: 50%;
    border: 2px solid #fff;
    display: flex; align-items: center; justify-content: center;
  }
  .ft-logo .circle-inner {
    width: 20px; height: 20px;
    border-radius: 50%;
    border: 2px solid #fff;
  }
  .ft-site {
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .discount { color: #CC0000; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="hd">
  <div class="hd-logo">
    <div class="circle"><div class="circle-inner"></div></div>
    <span class="brand">ONYRIA</span>
    <span class="sub">Studio</span>
  </div>
  <div class="hd-center">Cotización</div>
  <div class="hd-right">
    <div class="num">N° ${p.numero || '—'}</div>
    <div>${fecha}</div>
  </div>
</div>

<!-- BODY -->
<div class="body">

  <!-- Para / De -->
  <div class="info-block">
    <div class="info-row"><span class="info-lbl">Para:</span><span class="info-val">${p.cliente_nombre || ''}</span></div>
    ${p.cliente_empresa ? `<div class="info-row"><span class="info-lbl">Cliente:</span><span class="info-val">${p.cliente_empresa}</span></div>` : ''}
    ${p.cliente_email   ? `<div class="info-row"><span class="info-lbl">Mail:</span><span class="info-val">${p.cliente_email}</span></div>`   : ''}
    <div class="info-row" style="margin-top:6px;"><span class="info-lbl">De:</span><span class="info-val">Carolina Zepeda</span></div>
    <div class="info-row"><span class="info-lbl">Mail:</span><span class="info-val">carolina@onyria-studio.cl</span></div>
  </div>

  <!-- Proyecto -->
  <div class="sec-heading">Proyecto:</div>
  <p style="font-weight:700;font-size:12px;margin-bottom:4px;">${p.nombre_proyecto || '—'}</p>

  <!-- Detalle -->
  <div class="sec-heading">Detalle:</div>
  <ul class="detalle">${detalleHTML}</ul>

  <!-- Totales -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="t-row"><span class="lbl">Total Neto:</span><span>${fmtMonto(baseImpon, moneda)}</span></div>
      ${descPct > 0 ? `<div class="t-row"><span class="lbl">Descuento (${descPct}%):</span><span class="discount">- ${fmtMonto(descMonto, moneda)}</span></div>` : ''}
      <div class="t-row"><span class="lbl">IVA (19%):</span><span>${fmtMonto(ivaMonto, moneda)}</span></div>
      <div class="t-final"><span>TOTAL:</span><span>${fmtMonto(totalFinal, moneda)}</span></div>
    </div>
  </div>

  <!-- Observaciones -->
  ${obsLines ? `
  <div class="ds">
    <div class="ds-head">Observaciones</div>
    <div class="ds-body"><ul>${obsLines}</ul></div>
  </div>` : ''}

  <!-- Forma de Pago -->
  <div class="ds">
    <div class="ds-head">Forma de Pago</div>
    <div class="ds-body">
      <div class="pago-lead">30 a 60 días</div>
      <ul>${condHTML}</ul>
    </div>
  </div>

  <!-- Empresa -->
  <div class="company-wrap">
    <p><strong>Onyria Studio SpA</strong></p>
    <p>Rut: 77.946.076-2</p>
    <p>Dirección: Santa Magdalena 75 of 304, Providencia</p>
  </div>

  <div class="divider"></div>

  <!-- Banco -->
  <div class="bank-wrap">
    <p>Banco Santander &ndash; Cta corriente No 0-000-9632329-8</p>
    <p>Correo: carolina@onyria-studio.cl</p>
  </div>

</div><!-- /body -->

<!-- FOOTER -->
<div class="ft">
  <div class="ft-logo">
    <div class="circle"><div class="circle-inner"></div></div>
  </div>
  <span class="ft-site">www.onyria-studio.cl</span>
</div>

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
