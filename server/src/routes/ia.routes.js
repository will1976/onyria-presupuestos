/**
 * Rutas IA — Pipeline v2 (único pipeline).
 *
 *   POST /api/ia/analizar               → pipeline v2 (compatibilidad frontend)
 *   POST /api/ia/v2                     → mismo endpoint, alias explícito
 *   GET  /api/ia/v2/embeddings/status   → inspeccionar el índice de embeddings
 *   POST /api/ia/v2/embeddings/rebuild  → regenerar embeddings (body: { force?: boolean })
 *
 * Pipeline:
 *   - Embeddings locales con @xenova/transformers (Xenova/all-MiniLM-L6-v2)
 *   - Búsqueda semántica por cosine similarity
 *   - Validación estricta contra catálogo (no inventa servicios)
 */

const router = require('express').Router()
const v2     = require('../controllers/ia.v2.controller')
const { iaLimiter } = require('../middleware/rateLimiter')

router.post('/analizar', iaLimiter, v2.analizarV2)
router.post('/v2',       iaLimiter, v2.analizarV2)

router.get ('/v2/embeddings/status',  v2.embeddingsStatus)
router.post('/v2/embeddings/rebuild', v2.embeddingsRebuild)

module.exports = router
