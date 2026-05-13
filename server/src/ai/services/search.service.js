/**
 * Búsqueda semántica de servicios usando embeddings locales + cosine similarity.
 *
 * Pasos:
 *  1. Generar embedding del texto de búsqueda
 *  2. Cargar servicios activos que tengan embedding precalculado
 *  3. Calcular cosine similarity contra cada uno
 *  4. Filtrar por threshold y devolver top K con score
 *
 * Si la `categoria` está disponible (de la intent), filtramos primero por ahí
 * para reducir el espacio de búsqueda (opcional, controlado por opts).
 */

const { embeddingsAdapter } = require('../adapters/embeddings.adapter')
const { serviciosRepo }     = require('../../repositories')
const { topKBySimilarity }  = require('../utils/cosine')
const config                = require('../config')
const { makeLogger }        = require('../utils/logger')

const log = makeLogger('search')

/**
 * @param {string} text
 * @param {object} [opts]
 * @param {string} [opts.categoria]     Si se pasa, filtra candidatos por esta categoría
 * @param {number} [opts.topK]
 * @param {number} [opts.threshold]
 * @returns {Promise<Array<{id:string, nombre:string, categoria:string, descripcion:string, precio_base:number, similarity_score:number, [k:string]:any}>>}
 */
async function findRelevantServices(text, opts = {}) {
  const topK      = opts.topK      ?? config.search.topK
  const threshold = opts.threshold ?? config.search.threshold

  // 1. Embedding del query
  const queryVec = await embeddingsAdapter.generateEmbedding(text)

  // 2. Cargar candidatos con embedding (filtrar por categoría si aplica)
  let candidatos = serviciosRepo.listarConEmbedding()
  if (opts.categoria) {
    const filtered = candidatos.filter(s => s.categoria === opts.categoria)
    // Si filtrar por categoría deja muy pocos candidatos, ampliar al total
    candidatos = filtered.length >= Math.min(topK, 3) ? filtered : candidatos
  }

  if (candidatos.length === 0) {
    log.warn('No hay servicios con embedding. Ejecuta generateServiceEmbeddings primero.')
    return []
  }

  // 3. & 4. Cosine + top K
  const scored = topKBySimilarity(queryVec, candidatos, { topK, threshold })

  return scored.map(({ item, score }) => ({
    id:                item.id,
    nombre:            item.nombre,
    categoria:         item.categoria,
    descripcion:       item.descripcion,
    precio_base:       item.precio_base,
    porcentaje_boleta: item.porcentaje_boleta,
    moneda:            item.moneda,
    unidad:            item.unidad,
    similarity_score:  score,
  }))
}

module.exports = { findRelevantServices }
