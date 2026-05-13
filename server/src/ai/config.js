/**
 * Configuración centralizada del pipeline IA v2.
 *
 * Variables de entorno relevantes:
 *  - GROQ_API_KEY            (requerido para extracción/validación)
 *  - GROQ_MODEL              (default: 'llama-3.3-70b-versatile')
 *  - EMBEDDINGS_MODEL        (default: 'Xenova/all-MiniLM-L6-v2', 384 dim)
 *  - USE_NEW_AI_PIPELINE     (default: false)  → cuando true, /api/ia/analizar
 *                              delega al pipeline v2 internamente
 *  - SIMILARITY_THRESHOLD    (default: 0.35)
 *  - TOP_K_CANDIDATES        (default: 5)
 *  - AUTO_SELECT_THRESHOLD   (default: 0.85)
 *  - SUGGEST_THRESHOLD       (default: 0.60)
 */

require('dotenv').config()

module.exports = {
  groq: {
    apiKey:      process.env.GROQ_API_KEY,
    model:       process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.2,
    maxTokens:   2048,
  },
  embeddings: {
    model:        process.env.EMBEDDINGS_MODEL || 'Xenova/all-MiniLM-L6-v2',
    dimensions:   384,
    pooling:      'mean',   // mean pooling sobre los token embeddings
    normalize:    true,     // L2 normalize (recomendado para cosine)
  },
  search: {
    threshold:           parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.35,
    topK:                parseInt(process.env.TOP_K_CANDIDATES, 10)    || 5,
    autoSelectThreshold: parseFloat(process.env.AUTO_SELECT_THRESHOLD) || 0.85,
    suggestThreshold:    parseFloat(process.env.SUGGEST_THRESHOLD)     || 0.60,
  },
  flags: {
    useNewPipeline: process.env.USE_NEW_AI_PIPELINE === 'true',
  },
}
