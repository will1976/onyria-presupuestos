/**
 * Generador de PDFs corporativos (Onyria).
 *
 * Arquitectura:
 *   1. Handlebars compila `templates/quotation.hbs` con los datos.
 *   2. Puppeteer renderiza el HTML resultante en Chromium headless.
 *   3. `displayHeaderFooter: true` hace que header.png y footer.png
 *      aparezcan en CADA página automáticamente.
 *   4. El contenido fluye con flow layout (sin position:absolute).
 *      Si la lista de items o el texto de observaciones es muy largo,
 *      el PDF agrega páginas automáticamente.
 *
 * API pública:
 *   const { generarPDF } = require('./pdf/pdf-generator')
 *   const buffer = await generarPDF(presupuesto)   // shape: el row de DB
 *   // o pasando datos ya mapeados:
 *   const buffer = await generarPDF({ data: { numeroCotizacion: ... } })
 */

const fs         = require('fs')
const path       = require('path')
const puppeteer  = require('puppeteer')
const Handlebars = require('handlebars')
const sharp      = require('sharp')
const { presupuestoAdapter } = require('./presupuesto.adapter')

// ── Rutas ─────────────────────────────────────────────────────────────────
const TEMPLATE_FILE = path.join(__dirname, 'templates', 'quotation.hbs')
const HEADER_FILE   = path.join(__dirname, 'assets',    'header.png')
const FOOTER_FILE   = path.join(__dirname, 'assets',    'footer.png')

// ── Caches ────────────────────────────────────────────────────────────────
// En dev (NODE_ENV !== 'production') se recompila el template y se relee
// header/footer en cada generación, así editas .hbs o las imágenes y solo
// refrescas el PDF sin reiniciar el server.
const DEV_MODE = process.env.NODE_ENV !== 'production'

/** Compilado de Handlebars en memoria */
let _compiledTemplate = null
function getTemplate() {
  if (_compiledTemplate && !DEV_MODE) return _compiledTemplate
  const src = fs.readFileSync(TEMPLATE_FILE, 'utf8')
  _compiledTemplate = Handlebars.compile(src, { noEscape: false })
  return _compiledTemplate
}

/** PNGs en base64 cacheados (header/footer) */
const _imageCache = {}
function getImageBase64(file) {
  if (_imageCache[file] && !DEV_MODE) return _imageCache[file]
  const buf = fs.readFileSync(file)
  _imageCache[file] = `data:image/png;base64,${buf.toString('base64')}`
  return _imageCache[file]
}

// ── Browser singleton ────────────────────────────────────────────────────
let _browserPromise = null
function getBrowser() {
  if (!_browserPromise) {
    _browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
    _browserPromise.then(b => b.on('disconnected', () => { _browserPromise = null }))
                   .catch(() => { _browserPromise = null })
  }
  return _browserPromise
}

// ── Header / Footer HTML ─────────────────────────────────────────────────
/**
 * Plantillas para displayHeaderFooter de Puppeteer.
 * Chromium las renderiza con CSS por defecto agresivamente reducido
 * (font-size: 0). Por eso el truco es envolver en un div con tamaño explícito.
 */
/**
 * Chromium aplica padding horizontal por defecto a headerTemplate/footerTemplate
 * (~36px) y un pequeño offset vertical. Usamos position:absolute con left:0,
 * right:0, top:0/bottom:0 para llenar la zona completamente — edge to edge.
 *
 * El header además lleva un overlay con N° de cotización y fecha sobre el banner
 * (texto blanco, alineado a la derecha). Se inyecta data al render porque
 * Puppeteer no procesa Handlebars en headerTemplate.
 */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]
  ))
}

/**
 * Construye una versión de header.png con el N° y la fecha ya dibujados
 * en blanco SOBRE la imagen (via SVG composite con Sharp).
 *
 * Approach bulletproof: Chromium tiene quirks raros con position:absolute
 * + color CSS en headerTemplate que hacían el overlay invisible. Baking the
 * text into the image bytes evita por completo ese problema.
 *
 * @returns {Promise<string>} data: URL PNG base64
 */
async function buildHeaderImage(data = {}) {
  const headerBuffer = fs.readFileSync(HEADER_FILE)
  const meta = await sharp(headerBuffer).metadata()

  const numero = String(data.numeroCotizacion || '').replace(/[<>&"]/g, '')
  const fecha  = String(data.fechaCotizacion  || '').replace(/[<>&"]/g, '')

  // Tamaños MUY chicos para coincidir con la cotización de referencia.
  // header.png ~297px de alto → N° queda en ~33px (~13pt en PDF), fecha ~27px (~10pt).
  // rightPad: 6% del ancho ≈ 1cm sobre A4 (move el texto 1cm más a la izquierda
  //   respecto al borde derecho)
  // numY/fechaY: gap reducido a la mitad (antes 20% del alto, ahora 10%)
  const numSize   = Math.round(meta.height * 0.11)
  const fechaSize = Math.round(meta.height * 0.09)
  const rightPad  = Math.round(meta.width  * 0.060)
  const numY      = Math.round(meta.height * 0.52)
  const fechaY    = Math.round(meta.height * 0.62)

  const svg = `
    <svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .num   { fill: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-weight: 700; }
        .fecha { fill: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-weight: 400; }
      </style>
      <text x="${meta.width - rightPad}" y="${numY}"   text-anchor="end" class="num"   font-size="${numSize}">N° ${numero}</text>
      <text x="${meta.width - rightPad}" y="${fechaY}" text-anchor="end" class="fecha" font-size="${fechaSize}">${fecha}</text>
    </svg>
  `

  // Importante: usar JPEG calidad ~85 para que la data URL no exceda los ~200KB.
  // Chromium silenciosamente rechaza data URLs muy grandes (>500KB) en
  // headerTemplate y termina mostrando solo el banner sin el overlay.
  const composited = await sharp(headerBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()

  return `data:image/jpeg;base64,${composited.toString('base64')}`
}

async function buildHeaderHtml(data = {}) {
  const imgWithText = await buildHeaderImage(data)
  return `
    <style>
      #header, html, body { margin:0 !important; padding:0 !important; }
    </style>
    <div style="position:absolute; top:0; left:0; right:0; width:100%; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
      <img src="${imgWithText}" style="display:block; width:100%; margin:0; padding:0; border:0;" />
    </div>
  `
}

/**
 * Convierte footer.png a JPEG comprimido (data URL) para evitar el límite
 * de tamaño de Chromium en footerTemplate. Cacheado.
 */
let _footerJpegPromise = null
function getFooterJpeg() {
  if (_footerJpegPromise && !DEV_MODE) return _footerJpegPromise
  _footerJpegPromise = sharp(fs.readFileSync(FOOTER_FILE))
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()
    .then(buf => `data:image/jpeg;base64,${buf.toString('base64')}`)
  return _footerJpegPromise
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[<>&"']/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c])
  )
}

/**
 * footerTemplate de Puppeteer: contenido que se repite en CADA página.
 * Estructura (de arriba a abajo dentro del margen inferior):
 *   1. Observaciones (bar + bullets)
 *   2. Forma de Pago (bar beige)
 *   3. Condiciones (bullets)
 *   4. Empresa (2 barras azul oscuro con datos)
 *   5. footer.png (logo + url al pie)
 *
 * Por la regla del cliente: estos bloques aparecen en TODAS las páginas;
 * los Totales NO van acá (se quedan en el body para mostrarse sólo en la
 * última página, después del último item del detalle).
 */
async function buildFooterHtml(data = {}) {
  const img    = await getFooterJpeg()
  const obs    = Array.isArray(data.observaciones) ? data.observaciones : []
  const cond   = Array.isArray(data.condiciones)   ? data.condiciones   : []
  const fp     = data.formaPago || ''
  const emp    = data.empresa || {}

  const obsHtml = obs.length ? `
    <div style="background-color:#0E4561 !important;color:#FFFFFF !important;padding:1.3mm 18mm;font-weight:700;font-size:7pt;letter-spacing:0.3px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Observaciones</div>
    <ul style="list-style:disc;padding-left:23mm;padding-right:18mm;font-size:7pt;line-height:1.3;color:#0E2A38 !important;margin:1.2mm 0 0;">
      ${obs.map(o => `<li style="margin-bottom:0.4mm;padding-left:1mm;">${escHtml(o)}</li>`).join('')}
    </ul>` : ''

  const fpHtml = fp ? `
    <div style="background-color:#E8E5DC !important;color:#0E2A38 !important;padding:1.3mm 18mm;font-weight:700;font-size:7pt;margin-top:2mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Forma de Pago: ${escHtml(fp)}</div>` : ''

  const condHtml = cond.length ? `
    <ul style="list-style:disc;padding-left:23mm;padding-right:18mm;font-size:6pt;line-height:1.2;color:#0E2A38 !important;margin:1.5mm 0 0;">
      ${cond.map(c => `<li style="margin-bottom:0.3mm;padding-left:1mm;">${escHtml(c)}</li>`).join('')}
    </ul>` : ''

  const empHtml = emp.nombre ? `
    <div style="text-align:center;color:#0E2A38 !important;margin-top:3mm;">
      <div style="height:2.5mm;background-color:#0E4561 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      <div style="padding:1.5mm 0;font-size:7pt;line-height:1.3;">
        <div style="font-weight:700;font-size:7.5pt;">${escHtml(emp.nombre)}</div>
        ${emp.rut       ? `<div>Rut: ${escHtml(emp.rut)}</div>` : ''}
        ${emp.direccion ? `<div>Dirección: ${escHtml(emp.direccion)}</div>` : ''}
      </div>
      <div style="height:2.5mm;background-color:#0E4561 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      <div style="padding:1.5mm 0;font-size:7pt;line-height:1.3;">
        ${emp.banco  ? `<div>${escHtml(emp.banco)}</div>` : ''}
        ${emp.correo ? `<div>Correo: ${escHtml(emp.correo)}</div>` : ''}
      </div>
    </div>` : ''

  return `
    <style>
      #footer, html, body { margin:0 !important; padding:0 !important; font-size:10px !important; color:#0E2A38 !important; }
    </style>
    <div style="position:absolute; bottom:0; left:0; right:0; width:100%; margin:0; padding:0; font-family:'DM Sans','Helvetica Neue',Arial,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
      ${obsHtml}
      ${fpHtml}
      ${condHtml}
      ${empHtml}
      <img src="${img}" style="display:block;width:100%;margin:0;padding:0;border:0;" />
    </div>
  `
}

// ── API principal ────────────────────────────────────────────────────────
/**
 * Genera un PDF a partir de un presupuesto (o de un objeto data ya adaptado).
 *
 * Acepta dos formas para mantener compatibilidad:
 *   - generarPDF(presupuestoFila)      → pasa por el adapter
 *   - generarPDF({ data: contextoYa }) → usa el contexto tal cual
 *
 * @returns {Promise<Buffer>}
 */
async function generarPDF(input) {
  const t0 = Date.now()

  // Adaptar shape de DB → variables del template
  const data = input && input.data
    ? input.data
    : presupuestoAdapter(input)

  // Compilar HTML
  const template = getTemplate()
  const html     = template(data)

  // Renderizar con Puppeteer
  const browser = await getBrowser()
  const page    = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: await buildHeaderHtml(data),
      footerTemplate: await buildFooterHtml(data),
      // left/right en 0 para que header.png y footer.png lleguen al borde.
      // El padding horizontal del contenido lo aplica body { padding: 0 18mm; } en el .hbs.
      // bottom 115mm reserva espacio para todo el bloque inferior repetido en cada página:
      //   Observaciones + Forma de Pago + Condiciones + Empresa + footer.png ≈ 106-110mm.
      //   Usamos 115mm de safety para evitar que el body se solape cuando el footer crece.
      margin: { top: '36mm', bottom: '115mm', left: '0', right: '0' },
      preferCSSPageSize: false,
    })

    console.log(`[pdf] generado en ${Date.now() - t0}ms (n°${data.numeroCotizacion || '—'})`)
    return pdfBuffer
  } finally {
    await page.close().catch(() => {})
  }
}

/** Útil para tests / debug: devuelve el HTML que se renderizaría */
function buildHtml(input) {
  const data = input && input.data ? input.data : presupuestoAdapter(input)
  return getTemplate()(data)
}

/** Útil para tests: el contexto crudo del adapter */
function buildContext(presupuesto) {
  return presupuestoAdapter(presupuesto)
}

module.exports = { generarPDF, buildHtml, buildContext }
