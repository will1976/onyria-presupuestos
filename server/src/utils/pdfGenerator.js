const puppeteer = require('puppeteer')
const path      = require('path')
const fs        = require('fs')
const config    = require('../config')

const PUBLIC_DIR = path.join(__dirname, '../../../client/public')

// ── Carga imagen como base64 y lee dimensiones del header PNG ──────────────
function loadImage(filename) {
  try {
    const buf = fs.readFileSync(path.join(PUBLIC_DIR, filename))
    let renderedH = 100
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf.length >= 24) {
      const w = buf.readUInt32BE(16)
      const h = buf.readUInt32BE(20)
      // A4 en Puppeteer ≈ 794 px de ancho
      renderedH = Math.round((794 / w) * h)
    }
    return { uri: `data:image/png;base64,${buf.toString('base64')}`, h: renderedH }
  } catch (_) {
    return { uri: '', h: 0 }
  }
}

const INICIO = loadImage('inicio.png')  // { uri, h: 122 }
const FINAL  = loadImage('final.png')   // { uri, h: 116 }

// Margen extra para que el texto no toque la imagen
const PAD = 12
const TOP_PX    = INICIO.h + PAD
const BOTTOM_PX = FINAL.h  + PAD

const DEFAULT_CONDITIONS = `Condiciones de pago: 30 a 60 días desde la facturación.
Una vez aprobada esta cotización, se deberá enviar Orden de Compra para empezar la producción.
Se permitirá solo dos cambios por armado por motivos de cambios de guión, o texto. (Las correcciones de guión por exceso de duración de la pieza, serán consideradas como cambio).
La cantidad de producción o servicios asociada a presupuestos que se consideren paquete o fee mensual tienen un plazo para realizar dicha producción dentro de los días hábiles del mismo mes, por lo que no son acumulables.
No está autorizado el uso parcial o total de este material en otras piezas comerciales u otros medios de difusión, que no se especifique en esta cotización.
Todos los trabajos consideran derechos por 12 meses, salvo que se especifique algo distinto en el detalle de la cotización.
Los trabajos en producción o terminados, tienen un plazo activo de un máximo de 1 mes desde su fecha de inicio. Cualquier cambio posterior a ese plazo de tiempo, queda afecto a un costo adicional. Así mismo, la publicación o salida al aire de una pieza considera el trabajo como finalizado.
El inicio de los derechos que contempla cada pieza comienzan a regir desde el momento que se entrega el final, a menos que ambas partes acuerden lo contrario.`

function formatMonto(monto, moneda) {
  if (moneda === 'CLP') return `$${Math.round(monto).toLocaleString('es-CL')} CLP`
  return `USD ${Number(monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function buildHTML(presupuesto) {
  const { items = [] } = presupuesto
  const descPct   = parseFloat(presupuesto.descuento || 0)
  const descMonto = presupuesto.subtotal * (descPct / 100)
  const condiciones = presupuesto.condiciones || DEFAULT_CONDITIONS
  const fecha = presupuesto.fecha_emision
    ? new Date(presupuesto.fecha_emision).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const rows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#F9F7F4' : '#FFFFFF'}">
      <td>${item.descripcion_personalizada || item.descripcion || '—'}</td>
      <td class="center">${item.cantidad}</td>
      <td class="right">${formatMonto(item.precio_unitario, presupuesto.moneda)}</td>
      <td class="right bold">${formatMonto(item.subtotal, presupuesto.moneda)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* Imágenes fijas: se repiten en cada página */
    .banner-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      width: 100%; display: block;
      z-index: 1000;
    }
    .banner-footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      width: 100%; display: block;
      z-index: 1000;
    }

    /* El body tiene padding para que el contenido no quede debajo de las imágenes */
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      color: #1A1A2E;
      background: #FFF;
      font-size: 12px;
      line-height: 1.6;
      padding-top: ${TOP_PX}px;
      padding-bottom: ${BOTTOM_PX}px;
    }

    .content { padding: 20px 48px 28px; }

    .pres-meta { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .pres-box  { text-align: right; background: #F9F7F4; border-left: 3px solid #C9A84C; padding: 10px 18px; border-radius: 2px; }
    .pres-box .num  { font-size: 15px; font-weight: 700; color: #1A1A2E; }
    .pres-box .meta { font-size: 11px; color: #666; margin-top: 2px; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
    .info-section h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #C9A84C; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #F0E8D8; }
    .info-section p  { font-size: 12px; color: #333; margin-bottom: 2px; }
    .info-section .strong { font-weight: 700; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1A1A2E; color: #FFF; }
    th { padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
    td { padding: 9px 14px; font-size: 12px; border-bottom: 1px solid #F0EDE8; }
    td.center { text-align: center; }
    td.right  { text-align: right; }
    td.bold   { font-weight: 700; }

    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-box  { width: 300px; }
    .total-row   { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEE; font-size: 12px; }
    .total-row .label { color: #555; }
    .total-final { display: flex; justify-content: space-between; padding: 12px 0 6px; border-top: 2px solid #C9A84C; font-size: 16px; font-weight: 700; color: #C9A84C; }

    .notes-box { background: #F9F7F4; border-left: 3px solid #C9A84C; padding: 14px 16px; margin-bottom: 20px; border-radius: 2px; }
    .notes-box p { font-size: 12px; color: #444; }

    .conditions { border-top: 1px solid #E5E0D8; padding-top: 16px; margin-bottom: 20px; }
    .conditions h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 8px; }
    .conditions p  { font-size: 10.5px; color: #666; line-height: 1.8; }

    .discount { color: #CC0000; }
  </style>
</head>
<body>
  ${INICIO.uri ? `<img class="banner-header" src="${INICIO.uri}" alt="">` : ''}
  ${FINAL.uri  ? `<img class="banner-footer" src="${FINAL.uri}"  alt="">` : ''}

  <div class="content">
    <div class="pres-meta">
      <div class="pres-box">
        <div class="num">N° ${presupuesto.numero}</div>
        <div class="meta">Fecha: ${fecha}</div>
        <div class="meta">Válido por ${presupuesto.validez_dias || 30} días</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-section">
        <h4>Cliente</h4>
        <p class="strong">${presupuesto.cliente_nombre || '—'}</p>
        ${presupuesto.cliente_empresa  ? `<p>${presupuesto.cliente_empresa}</p>`  : ''}
        ${presupuesto.cliente_email    ? `<p>${presupuesto.cliente_email}</p>`    : ''}
        ${presupuesto.cliente_telefono ? `<p>${presupuesto.cliente_telefono}</p>` : ''}
      </div>
      <div class="info-section">
        <h4>Proyecto</h4>
        <p class="strong">${presupuesto.nombre_proyecto || '—'}</p>
        ${presupuesto.tipo_proyecto ? `<p>${presupuesto.tipo_proyecto.replace(/_/g, ' ')}</p>` : ''}
      </div>
    </div>

    ${presupuesto.notas ? `<div class="notes-box"><p>${presupuesto.notas.replace(/\n/g, '<br>')}</p></div>` : ''}

    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="center">Cant.</th>
          <th class="right">Precio Unitario</th>
          <th class="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4">Sin ítems</td></tr>'}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="total-row"><span class="label">Subtotal</span><span>${formatMonto(presupuesto.subtotal, presupuesto.moneda)}</span></div>
        ${descPct > 0 ? `<div class="total-row"><span class="label">Descuento (${descPct}%)</span><span class="discount">- ${formatMonto(descMonto, presupuesto.moneda)}</span></div>` : ''}
        <div class="total-row"><span class="label">IVA (19%)</span><span>${formatMonto(presupuesto.impuesto, presupuesto.moneda)}</span></div>
        <div class="total-final"><span>TOTAL</span><span>${formatMonto(presupuesto.total, presupuesto.moneda)}</span></div>
      </div>
    </div>

    <div class="conditions">
      <h4>Condiciones Comerciales</h4>
      <p>${condiciones.replace(/\n/g, '<br>')}</p>
    </div>
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
