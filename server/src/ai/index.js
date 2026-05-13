/**
 * Punto de entrada del módulo IA v2.
 *
 * Re-exporta lo que el resto de la app necesita usar:
 *  - runPipeline           → orquestador completo
 *  - findRelevantServices  → búsqueda semántica sola
 *  - generateServiceEmbeddings → job de bulk indexing
 *  - embeddingsAdapter     → para casos avanzados
 *  - config                → flags y thresholds
 */

const { runPipeline, classifyConfidence } = require('./services/pipeline.service')
const { findRelevantServices }            = require('./services/search.service')
const { extractStructuredIntent }         = require('./services/intent.service')
const { normalizeUserInput }              = require('./services/normalizer.service')
const { validateAndSelect }               = require('./services/validator.service')
const { generateServiceEmbeddings, rebuildAllEmbeddings } = require('./jobs/generateServiceEmbeddings')
const { embeddingsAdapter }               = require('./adapters/embeddings.adapter')
const { groqAdapter }                     = require('./adapters/groq.adapter')
const config                              = require('./config')

module.exports = {
  // Pipeline
  runPipeline,
  classifyConfidence,
  // Servicios individuales
  normalizeUserInput,
  extractStructuredIntent,
  findRelevantServices,
  validateAndSelect,
  // Jobs
  generateServiceEmbeddings,
  rebuildAllEmbeddings,
  // Adapters (avanzado)
  embeddingsAdapter,
  groqAdapter,
  // Config
  config,
}
