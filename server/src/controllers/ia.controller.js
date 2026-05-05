const { analizarConCatalogo } = require('../utils/geminiClient')
const { query }               = require('../db')

// ── Fuzzy matching helpers ─────────────────────────────────────────────────
function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita tildes
    .replace(/['"´`]/g, '')                             // quita comillas
    .replace(/[^a-z0-9\s]/g, ' ')                       // no alfanumérico → espacio
    .replace(/\s+/g, ' ').trim()
}

// Palabras clave que identifican servicios (sinónimos coloquiales → canonical)
const SINONIMOS = {
  'edicion': ['edicion', 'armado', 'montaje', 'editar', 'corte'],
  'mix':     ['mix', 'mezcla', 'mezclado'],
  'master':  ['master', 'mastering', 'masterizacion', 'masterizar'],
  'sonorizacion': ['sonorizacion', 'sonorizar', 'si ', 's.i', 'reemplazo audio'],
  'locucion': ['locucion', 'locu', 'voz en off', 'off', 'voice over', 'narrador'],
  'casting': ['casting', 'seleccion voces'],
  'honorarios': ['honorarios', 'actor', 'locutor', 'personaje'],
  'entrega': ['entrega', 'archivos', 'formatos', 'render', 'exportacion'],
  'lipsync': ['lipsync', 'lip sync', 'sincronizacion labios'],
  'ajuste':  ['ajuste', 'ajustes', 'correccion', 'correcciones', 'cambio'],
  'derechos': ['derechos', 'licencia', 'uso'],
  'post':    ['post', 'post digital', 'publicacion digital', 'redes'],
}

function expandirSinonimos(texto) {
  const t = normalize(texto)
  for (const [canon, syns] of Object.entries(SINONIMOS)) {
    if (syns.some(s => t.includes(s))) return canon
  }
  return t
}

function wordOverlapScore(aiName, catName, catDesc) {
  const aiNorm   = normalize(aiName)
  const catNorm  = normalize(catName)
  const descNorm = normalize(catDesc || '')

  // Expand con sinónimos para detectar equivalencias semánticas
  const aiCanon  = expandirSinonimos(aiNorm)
  const catCanon = expandirSinonimos(catNorm)

  // Coincidencia exacta de canónico → score máximo
  if (aiCanon && catCanon && aiCanon === catCanon) return 1.0

  // Palabras relevantes (> 2 chars)
  const wordsAI  = aiNorm.split(' ').filter(w => w.length > 2)
  const wordsCat = catNorm.split(' ').filter(w => w.length > 2)
  const wordsDesc = descNorm.split(' ').filter(w => w.length > 2)

  if (!wordsAI.length) return 0

  // Cuántas palabras del nombre IA aparecen en nombre o desc del catálogo
  const allCatWords = [...new Set([...wordsCat, ...wordsDesc])]
  const hits = wordsAI.filter(wa =>
    allCatWords.some(wc => wc.includes(wa) || wa.includes(wc))
  )

  return hits.length / wordsAI.length
}

function fuzzyFindCatalog(servicioAI, catalogo) {
  let bestScore = 0
  let bestMatch = null

  for (const cs of catalogo) {
    const score = wordOverlapScore(
      servicioAI.nombre_servicio,
      cs.nombre,
      cs.descripcion,
    )
    if (score > bestScore) {
      bestScore = score
      bestMatch = cs
    }
  }

  // Umbral mínimo 0.35 para evitar falsos positivos
  return bestScore >= 0.35 ? bestMatch : null
}

// ── POST /api/ia/analizar ──────────────────────────────────────────────────
async function analizar(req, res, next) {
  try {
    const { emailText } = req.body
    if (!emailText || emailText.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'El texto es demasiado corto' })
    }

    // 1. Traer catálogo activo
    const { rows: catalogo } = await query(
      `SELECT id, nombre, categoria, descripcion, precio_base, unidad, moneda, porcentaje_boleta
       FROM servicios WHERE activo = true ORDER BY categoria, nombre`
    )

    // 2. Llamar a la IA
    const resultado = await analizarConCatalogo(emailText.trim(), catalogo)

    // 3. Enriquecer cada servicio con match de catálogo
    const catalogoMap = new Map(catalogo.map(s => [s.id, s]))

    if (resultado.servicios?.length) {
      resultado.servicios = resultado.servicios.map(s => {
        // Nivel 1: ID exacto que devolvió la IA
        let match = s.catalogo_id ? catalogoMap.get(s.catalogo_id) : null

        // Nivel 2: fuzzy por nombre + descripción del catálogo
        if (!match) match = fuzzyFindCatalog(s, catalogo)

        // Nivel 3: fallback por categoría (cualquier servicio con precio)
        if (!match) match = catalogo.find(cs => cs.categoria === s.categoria && cs.precio_base > 0) || null

        if (match) {
          return {
            ...s,
            catalogo_id:       match.id,
            catalogo_nombre:   match.nombre,
            precio_unitario:   parseFloat(match.precio_base) || 0,
            porcentaje_boleta: parseFloat(match.porcentaje_boleta) || 0,
            moneda:            match.moneda || 'CLP',
            match_exacto:      match.id === s.catalogo_id,
          }
        }

        return {
          ...s,
          catalogo_id:       null,
          catalogo_nombre:   null,
          precio_unitario:   0,
          porcentaje_boleta: 0,
          moneda:            'CLP',
          match_exacto:      false,
        }
      })
    }

    res.json({ success: true, data: resultado })
  } catch (err) {
    console.error('[ia] Error:', err.message)
    if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Too Many Requests') || err.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Límite de solicitudes alcanzado. Espera unos segundos e intenta de nuevo.',
      })
    }
    if (err.message?.includes('GROQ_API_KEY')) {
      return res.status(500).json({ success: false, error: 'GROQ_API_KEY no configurada en el servidor.' })
    }
    next(err)
  }
}

module.exports = { analizar }
