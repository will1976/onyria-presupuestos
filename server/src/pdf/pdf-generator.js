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

  // Tamaños proporcionales al alto de la imagen (~297px para header.png actual).
  // En la cotización de referencia, N° y fecha son similares de tamaño,
  // ambos con peso regular (no bold) — fuente tipo Arial/Helvetica fina.
  const numSize   = Math.round(meta.height * 0.16)
  const fechaSize = Math.round(meta.height * 0.13)
  const rightPad  = Math.round(meta.width  * 0.018)
  const numY      = Math.round(meta.height * 0.48)
  const fechaY    = Math.round(meta.height * 0.74)

  const svg = `
    <svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .num   { fill: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-weight: 400; }
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

function buildFooterHtml() {
  const img = getImageBase64(FOOTER_FILE)
  return `
    <style>
      #footer, html, body { margin:0 !important; padding:0 !important; }
    </style>
    <div style="position:absolute; bottom:0; left:0; right:0; width:100%; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
      <img src="${img}" style="display:block; width:100%; margin:0; padding:0; border:0;" />
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
      footerTemplate: buildFooterHtml(),
      // left/right en 0 para que header.png y footer.png lleguen al borde.
      // El padding horizontal del contenido lo aplica body { padding: 0 18mm; } en el .hbs
      margin: { top: '36mm', bottom: '32mm', left: '0', right: '0' },
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
