/**
 * updateServiceEmbedding(serviceId)
 *
 * Regenera el embedding de UN SOLO servicio. Pensado para invocarse en:
 *   - crear servicio
 *   - editar servicio
 *
 * NO recalcula todos los embeddings (eso lo hace rebuildAllEmbeddings).
 *
 * Pasos:
 *   1. Carga el servicio desde SQLite por ID.
 *   2. Reconstruye el texto semántico (nombre + categoria + subcategoria +
 *      descripcion + aliases + tags + casos_uso + "NO RELACIONADO CON: " + no_aplica).
 *   3. Normaliza (lowercase/trim/dedupe/skip vacíos).
 *   4. Genera el embedding via embeddingsAdapter (singleton lazy).
 *   5. Guarda el embedding + embedding_updated_at en SQLite.
 *
 * Devuelve un objeto con metadata útil (no levanta excepciones — captura
 * y reporta para no bloquear el flujo del controller).
 */

const { embeddingsAdapter }    = require('../adapters/embeddings.adapter')
const { serviciosRepo }        = require('../../repositories')
const { csvToList, cleanText } = require('../utils/textNormalizer')
const { makeLogger }           = require('../utils/logger')

const log = makeLogger('Embedding')

/**
 * Construye el texto que se vectoriza para un servicio.
 * Normaliza: trim, lowercase para CSV, dedupe, ignora vacíos.
 * El nombre/descripción/categoría conservan su casing original (semánticamente útil).
 */
function buildSemanticText(s) {
  const partes = []

  if (s.nombre)       partes.push(cleanText(s.nombre))
  if (s.categoria)    partes.push(cleanText(s.categoria))
  if (s.subcategoria) partes.push(cleanText(s.subcategoria))
  if (s.descripcion)  partes.push(cleanText(s.descripcion))

  // Aliases y tags: CSV → lista limpia y dedupeada (case-insensitive)
  const aliases = dedupeLower(csvToList(s.aliases))
  if (aliases.length) partes.push(aliases.join(', '))

  const tags = dedupeLower(csvToList(s.tags))
  if (tags.length) partes.push(tags.join(', '))

  if (s.casos_uso) partes.push(cleanText(s.casos_uso))

  // no_aplica: prefijo "NO RELACIONADO CON:" para separar semánticamente
  const noAplica = dedupeLower(csvToList(s.no_aplica))
  if (noAplica.length) {
    partes.push('NO RELACIONADO CON: ' + noAplica.join(', '))
  }

  return partes.join('. ').slice(0, 2000)
}

/** dedupe case-insensitive, mantiene la primera forma encontrada */
function dedupeLower(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  const out = []
  for (const v of arr) {
    const key = String(v).toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(String(v).trim())
  }
  return out
}

/**
 * @typedef {Object} UpdateEmbeddingResult
 * @property {boolean} ok
 * @property {string}  serviceId
 * @property {string}  [nombre]
 * @property {string}  [updatedAt]
 * @property {number}  [dimensions]
 * @property {number}  [ms]
 * @property {string}  [error]
 * @property {string}  [reason]   // si ok=false: 'NOT_FOUND' | 'EMPTY_TEXT' | 'GENERATION_FAILED'
 */

/**
 * @param {string} serviceId
 * @returns {Promise<UpdateEmbeddingResult>}
 */
async function updateServiceEmbedding(serviceId) {
  const t0 = Date.now()

  if (!serviceId) {
    return { ok: false, serviceId, reason: 'INVALID_ID', error: 'serviceId requerido' }
  }

  const servicio = serviciosRepo.findById(serviceId)
  if (!servicio) {
    log.warn(`Service not found: ${serviceId}`)
    return { ok: false, serviceId, reason: 'NOT_FOUND', error: 'Servicio no encontrado' }
  }

  const text = buildSemanticText(servicio)
  if (!text) {
    log.warn(`Empty semantic text for service: ${servicio.nombre}`)
    return { ok: false, serviceId, nombre: servicio.nombre, reason: 'EMPTY_TEXT', error: 'Texto semántico vacío' }
  }

  log.info(`Service updated: ${servicio.nombre}`)

  let vector
  try {
    vector = await embeddingsAdapter.generateEmbedding(text)
  } catch (err) {
    log.error(`Embedding generation failed for "${servicio.nombre}":`, err.message)
    return {
      ok: false, serviceId, nombre: servicio.nombre,
      reason: 'GENERATION_FAILED', error: err.message,
    }
  }

  const updatedAt = serviciosRepo.setEmbedding(serviceId, vector)
  const ms = Date.now() - t0

  log.info('Embedding regenerated successfully')
  log.info(`Updated at: ${updatedAt}`)

  return {
    ok:         true,
    serviceId,
    nombre:     servicio.nombre,
    updatedAt,
    dimensions: vector.length,
    ms,
  }
}

module.exports = { updateServiceEmbedding, buildSemanticText }
