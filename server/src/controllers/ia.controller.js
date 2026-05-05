const { analizarConCatalogo } = require('../utils/geminiClient')
const { query }               = require('../db')

// POST /api/ia/analizar
async function analizar(req, res, next) {
  try {
    const { emailText } = req.body
    if (!emailText || emailText.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'El texto es demasiado corto' })
    }

    // 1. Fetch active catalog to give Gemini context for matching
    const { rows: catalogo } = await query(
      'SELECT id, nombre, categoria, descripcion, precio_base, unidad, moneda, porcentaje_boleta FROM servicios WHERE activo = true ORDER BY categoria, nombre'
    )

    // 2. Ask Gemini to analyze + match against catalog in one pass
    const resultado = await analizarConCatalogo(emailText.trim(), catalogo)

    // 3. Validate/enrich catalog matches — ensure IDs actually exist in our DB
    const catalogoMap = new Map(catalogo.map(s => [s.id, s]))

    if (resultado.servicios?.length) {
      resultado.servicios = resultado.servicios.map(s => {
        const match = s.catalogo_id ? catalogoMap.get(s.catalogo_id) : null

        if (match) {
          return {
            ...s,
            catalogo_id:    match.id,
            catalogo_nombre: match.nombre,
            precio_unitario: parseFloat(match.precio_base) || 0,
            moneda:          match.moneda || 'CLP',
            match_exacto:    true,
          }
        }

        // Gemini said no match — try a lightweight fallback by category
        const fallback = catalogo.find(cs => cs.categoria === s.categoria && cs.precio_base > 0)
        return {
          ...s,
          catalogo_id:     null,
          catalogo_nombre: null,
          precio_unitario: 0,
          moneda:          'CLP',
          match_exacto:    false,
          sugerencia_categoria: fallback
            ? { id: fallback.id, nombre: fallback.nombre, precio: fallback.precio_base, moneda: fallback.moneda }
            : null,
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
