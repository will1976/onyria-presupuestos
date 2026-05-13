/**
 * Controller del pipeline IA v2.
 *
 * POST /api/ia/v2
 *   body: { emailText: string }
 *   resp: { success, data: { intent, candidates, selected_services, requires_confirmation, trace } }
 *
 * También expone GET /api/ia/v2/embeddings/status para inspeccionar el estado
 * del índice de embeddings, y POST /api/ia/v2/embeddings/rebuild para forzar
 * regeneración (útil para debugging y al cambiar el catálogo).
 *
 * Mapea el resultado del pipeline a un payload compatible con la UI actual
 * (mismo shape de `data.servicios` que produce /api/ia/analizar) para que el
 * frontend NO requiera cambios, mientras también incluye los campos nuevos
 * (intent, trace, similarity_score) para quien quiera usarlos.
 */

const ai = require('../ai')
const { makeLogger } = require('../ai/utils/logger')
const log = makeLogger('controller')

/** Convierte el resultado del pipeline al shape esperado por el frontend actual */
function toLegacyShape(pipelineResult, originalText) {
  if (!pipelineResult.ok) {
    return { servicios: [], cliente: {}, proyecto: {} }
  }

  const servicios = pipelineResult.selected_services.map(s => ({
    catalogo_id:       s.id,
    catalogo_nombre:   s.nombre,
    nombre_servicio:   s.nombre,
    categoria:         s.categoria,
    descripcion_detalle: s.descripcion,
    cantidad:          1,
    precio_unitario:   s.precio_base,
    porcentaje_boleta: s.porcentaje_boleta,
    moneda:            s.moneda || 'CLP',
    match_exacto:      s.action === 'auto',
    confianza:         s.confidence,
    similarity_score:  pipelineResult.candidates.find(c => c.id === s.id)?.similarity_score ?? null,
    notas_tecnicas:    null,
    fragmento_texto:   null,
  }))

  return {
    servicios,
    cliente:  {},
    proyecto: { nombre: '', tipo: pipelineResult.intent.categoria || '' },
    // Campos nuevos (opcionales) que el frontend puede ignorar
    _v2: {
      intent:                pipelineResult.intent,
      candidates:            pipelineResult.candidates,
      requires_confirmation: pipelineResult.requires_confirmation,
      trace:                 pipelineResult.trace,
    },
  }
}

// ── POST /api/ia/v2 ─────────────────────────────────────────────────────────
async function analizarV2(req, res, next) {
  try {
    const { emailText } = req.body
    if (!emailText || emailText.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'El texto es demasiado corto' })
    }

    const result = await ai.runPipeline(emailText)
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.message || 'Error en pipeline IA' })
    }

    const data = toLegacyShape(result, emailText)
    return res.json({ success: true, data })
  } catch (err) {
    log.error('analizarV2:', err.message)
    if (err.code === 'RATE_LIMIT' || err.status === 429) {
      return res.status(429).json({ success: false, error: 'Rate limit alcanzado. Espera unos segundos.' })
    }
    next(err)
  }
}

// ── GET /api/ia/v2/embeddings/status ────────────────────────────────────────
async function embeddingsStatus(req, res, next) {
  try {
    const { serviciosRepo } = require('../repositories')
    const totalActivos     = serviciosRepo.count({ activo: true })
    const conEmbedding     = serviciosRepo.listarConEmbedding().length
    return res.json({
      success: true,
      data: {
        total_activos:  totalActivos,
        con_embedding:  conEmbedding,
        faltantes:      totalActivos - conEmbedding,
        modelo:         ai.config.embeddings.model,
        dimensiones:    ai.config.embeddings.dimensions,
      },
    })
  } catch (err) { next(err) }
}

// ── POST /api/ia/v2/embeddings/rebuild ──────────────────────────────────────
async function embeddingsRebuild(req, res, next) {
  try {
    const force = req.body?.force === true
    const result = await ai.generateServiceEmbeddings({ force })
    return res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

module.exports = { analizarV2, embeddingsStatus, embeddingsRebuild }
