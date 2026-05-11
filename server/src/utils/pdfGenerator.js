const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const TEMPLATE_PATH = path.join(__dirname, '../../templates/Template PDF Presupuesto.png')

function fmtMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `$ ${Math.round(n).toLocaleString('es-CL')}`
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function fmtFechaLarga(fechaIso) {
  const d = fechaIso ? new Date(fechaIso) : new Date()
  const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtNumero(n) {
  // ONY-2026-842 → 004451 (intenta extraer dígitos y mostrar 6)
  if (!n) return ''
  const digits = String(n).replace(/\D/g, '')
  return digits.padStart(6, '0')
}

function buildHTML(p, templateBase64) {
  const moneda    = p.moneda || 'CLP'
  const subtotal  = parseFloat(p.subtotal) || 0
  const descPct   = parseFloat(p.descuento) || 0
  const descMonto = subtotal * (descPct / 100)

  // Si hay ajuste: el ajuste_total ES el nuevo Total Neto
  // IVA = ajuste * 0.19, TOTAL = ajuste * 1.19
  let baseImpon, ivaMonto, totalFinal
  if (p.ajuste_total != null) {
    baseImpon  = parseFloat(p.ajuste_total)
    ivaMonto   = baseImpon * 0.19
    totalFinal = baseImpon + ivaMonto
  } else {
    baseImpon  = subtotal - descMonto
    ivaMonto   = parseFloat(p.impuesto) || 0
    totalFinal = parseFloat(p.total) || 0
  }

  const items = (p.items || []).filter(i => (i.descripcion_personalizada || i.descripcion))
  const detalleHTML = items.map(i => {
    const desc = i.descripcion_personalizada || i.descripcion
    const cant = parseFloat(i.cantidad) || 1
    const cantTxt = cant > 1 ? `${cant} ` : ''
    const notas = (i.notas || '').split(/[·•]/).map(s => s.trim()).filter(Boolean)
    const subBullets = notas.length
      ? `<ul class="sub">${notas.map(n => `<li>${n}</li>`).join('')}</ul>`
      : ''
    return `<li>${cantTxt}${desc}${subBullets}</li>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${p.numero}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', Arial, sans-serif; color: #1F5773; font-size: 10pt; }
    strong { color: #0E2A38; font-weight: 700; }
    .page {
      width: 210mm;
      height: 297mm;
      background: url('${templateBase64}') no-repeat center / 210mm 297mm;
      position: relative;
      overflow: hidden;
    }
    .abs { position: absolute; }

    /* N° y fecha sobre el banner (top-right, blanco sobre fondo oscuro) */
    .num-cot {
      position: absolute; right: 12mm; top: 13mm;
      color: #FFFFFF; font-size: 13pt; font-weight: 700; letter-spacing: 0.5px;
      text-align: right;
    }
    .fecha-cot {
      position: absolute; right: 12mm; top: 22mm;
      color: #FFFFFF; font-size: 9pt; opacity: 0.95;
      text-align: right;
    }

    /* Bloque "Para" + Cliente + Mail + De + Mail */
    .info-cliente {
      position: absolute; left: 18mm; top: 42mm;
      font-size: 10pt; line-height: 1.2;
    }
    .info-cliente .row { margin-bottom: 0; }
    .info-cliente .row strong { font-weight: 700; }

    /* Proyecto */
    .proyecto-wrap {
      position: absolute; left: 18mm; right: 18mm; top: 68mm;
      font-size: 10pt;
    }
    .proyecto-wrap .pname { font-weight: 700; margin-bottom: 4mm; color: #0E2A38; }
    .proyecto-wrap hr {
      border: none;
      border-top: 4px solid #0E4561;
      margin-top: 1mm;
    }

    /* Detalle */
    .detalle-wrap {
      position: absolute; left: 18mm; right: 90mm; top: 80mm;
      font-size: 10pt;
    }
    .detalle-wrap .lbl { font-weight: 700; text-decoration: underline; margin-bottom: 3mm; color: #0E2A38; }
    .detalle-wrap ul {
      list-style: disc;
      padding-left: 5mm;
      line-height: 1.7;
    }
    .detalle-wrap ul.sub {
      list-style: circle;
      padding-left: 6mm;
      margin-top: 0.5mm;
      line-height: 1.5;
    }
    .detalle-wrap ul li { padding-left: 1mm; }

    /* Observaciones (notas para el cliente) — sobre el header del template */
    .observaciones {
      position: absolute; left: 22mm; right: 18mm; top: 187mm;
      font-size: 9pt; line-height: 1.4; color: #0E2A38;
    }
    .observaciones ul {
      list-style: disc;
      padding-left: 5mm;
      margin: 0;
    }
    .observaciones li { padding-left: 1mm; margin-bottom: 1mm; }

    /* Totales (lado derecho, debajo del detalle) */
    .totales {
      position: absolute; right: 18mm; top: 145mm;
      font-size: 10pt; line-height: 1.9;
      text-align: right;
      font-weight: 700;
      color: #0E2A38;
    }
    .totales .tot-final { font-size: 12pt; }

  </style>
</head>
<body>
  <div class="page">

    <div class="num-cot">N° ${fmtNumero(p.numero)}</div>
    <div class="fecha-cot">${fmtFechaLarga(p.fecha_emision)}</div>

    <div class="info-cliente">
      <div class="row">Para: <strong>${p.cliente_nombre || ''}</strong></div>
      <div class="row">Cliente: <strong>${p.cliente_empresa || ''}</strong></div>
      <div class="row">Mail: <strong>${p.cliente_email || ''}</strong></div>
      <div class="row">De: <strong>Carolina Zepeda</strong></div>
      <div class="row">Mail: <strong>carolina@onyria-studio.cl</strong></div>
    </div>

    <div class="proyecto-wrap">
      <div>Proyecto: <span class="pname">${p.nombre_proyecto || ''}</span></div>
      <hr/>
    </div>

    <div class="detalle-wrap">
      <div class="lbl">Detalle:</div>
      <ul>${detalleHTML}</ul>
    </div>

    <div class="totales">
      <div>Total Neto: ${fmtMonto(baseImpon, moneda)}</div>
      <div>IVA (19%): ${fmtMonto(ivaMonto, moneda)}</div>
      <div class="tot-final">TOTAL: ${fmtMonto(totalFinal, moneda)}</div>
    </div>

    ${p.notas ? `<div class="observaciones">
      <ul>${p.notas.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('')}</ul>
    </div>` : ''}

  </div>
</body>
</html>`
}

// Cache del template (se lee una sola vez por proceso)
let cachedTemplateBase64 = null
function getTemplateBase64() {
  if (cachedTemplateBase64) return cachedTemplateBase64
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('Template PDF no encontrado: ' + TEMPLATE_PATH)
  }
  const pngBuffer = fs.readFileSync(TEMPLATE_PATH)
  cachedTemplateBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`
  return cachedTemplateBase64
}

// Browser de Puppeteer reutilizado entre requests
let browserPromise = null
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })
    // Si el browser se cae, resetear el cache para que se relance
    browserPromise.then(b => {
      b.on('disconnected', () => { browserPromise = null })
    }).catch(() => { browserPromise = null })
  }
  return browserPromise
}

async function generarPDF(presupuesto) {
  const t0 = Date.now()
  const html = buildHTML(presupuesto, getTemplateBase64())

  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      preferCSSPageSize: true,
    })

    console.log(`PDF generado en ${Date.now() - t0}ms (${presupuesto.numero})`)
    return pdf
  } finally {
    await page.close()
  }
}

module.exports = { generarPDF }
