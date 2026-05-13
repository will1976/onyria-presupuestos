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
 * @param {string} [opts.categoria]      Si se pasa, aplica boost a esa categoría
 * @param {boolean}[opts.hardFilter]     Si true, descarta candidatos de otras categorías
 *                                       (sólo si hay >= 3 en la categoría); por defecto false
 * @param {number} [opts.topK]
 * @param {number} [opts.threshold]
 * @param {number} [opts.boost]          Override del multiplicador de boost
 * @returns {Promise<Array<{id:string, nombre:string, categoria:string, descripcion:string, precio_base:number, similarity_score:number, base_score:number, boosted:boolean, [k:string]:any}>>}
 */
async function findRelevantServices(text, opts = {}) {
  const topK      = opts.topK      ?? config.search.topK
  const threshold = opts.threshold ?? config.search.threshold
  const boostMult = opts.boost     ?? config.search.categoryBoost

  // 1. Embedding del query
  const queryVec = await embeddingsAdapter.generateEmbedding(text)

  // 2. Cargar candidatos con embedding
  let candidatos = serviciosRepo.listarConEmbedding()

  // Filtro duro opcional (sólo si hay suficientes en esa categoría)
  if (opts.categoria && opts.hardFilter) {
    const filtered = candidatos.filter(s => s.categoria === opts.categoria)
    candidatos = filtered.length >= Math.min(topK, 3) ? filtered : candidatos
  }

  if (candidatos.length === 0) {
    log.warn('No hay servicios con embedding. Ejecuta generateServiceEmbeddings primero.')
    return []
  }

  // 3. Cosine similarity sin filtrar
  const scoredAll = topKBySimilarity(queryVec, candidatos, {
    topK: candidatos.length,  // primero scoreamos todos
    threshold,
  })

  // 4. Aplicar boost por categoría (clamped a 1.0 max para mantener escala)
  const finalScored = scoredAll.map(({ item, score }) => {
    const sameCategoria = opts.categoria && item.categoria === opts.categoria
    const boosted = sameCategoria && boostMult > 1
    const final   = boosted ? Math.min(1, score * boostMult) : score
    return { item, base_score: score, score: final, boosted }
  })

  // 5. Reordenar por score final y truncar
  finalScored.sort((a, b) => b.score - a.score)
  const top = finalScored.slice(0, topK)

  return top.map(({ item, score, base_score, boosted }) => ({
    id:                item.id,
    nombre:            item.nombre,
    categoria:         item.categoria,
    subcategoria:      item.subcategoria,
    descripcion:       item.descripcion,
    precio_base:       item.precio_base,
    porcentaje_boleta: item.porcentaje_boleta,
    moneda:            item.moneda,
    unidad:            item.unidad,
    similarity_score:  score,
    base_score,
    boosted,
  }))
}

module.exports = { findRelevantServices }
