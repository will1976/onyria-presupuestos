/**
 * Rutas IA.
 *
 *  POST /api/ia/analizar               → pipeline original (Groq + fuzzy matching)
 *  POST /api/ia/v2                     → pipeline nuevo (intent + cosine + validación cerrada)
 *  GET  /api/ia/v2/embeddings/status   → inspeccionar el índice de embeddings
 *  POST /api/ia/v2/embeddings/rebuild  → regenerar embeddings (body: { force?: boolean })
 *
 * Feature flag USE_NEW_AI_PIPELINE:
 *  - Si está activo, /api/ia/analizar delega internamente a /api/ia/v2.
 *  - El frontend no necesita cambiar nada.
 */

const router = require('express').Router()
const legacy = require('../controllers/ia.controller')
const v2     = require('../controllers/ia.v2.controller')
const aiConfig = require('../ai/config')
const { iaLimiter } = require('../middleware/rateLimiter')

// Endpoint legacy — internamente puede delegar a v2 según feature flag
router.post('/analizar', iaLimiter, (req, res, next) => {
  if (aiConfig.flags.useNewPipeline) {
    return v2.analizarV2(req, res, next)
  }
  return legacy.analizar(req, res, next)
})

// Nuevo endpoint dedicado a v2
router.post('/v2', iaLimiter, v2.analizarV2)

// Administración del índice de embeddings
router.get ('/v2/embeddings/status',  v2.embeddingsStatus)
router.post('/v2/embeddings/rebuild', v2.embeddingsRebuild)

module.exports = router
