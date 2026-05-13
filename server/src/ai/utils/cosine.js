/**
 * Cálculo de similitud coseno entre dos vectores.
 * Si los embeddings ya están L2-normalizados (lo que hacemos en
 * EmbeddingsAdapter), el dot product es igual a la similitud coseno
 * y este código sigue funcionando (dado que ||a|| = ||b|| = 1).
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} valor en [-1, 1]; 1 = idéntico, 0 = ortogonal
 */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0
  return dot / denom
}

/**
 * Dado un vector query y un array de items con embedding, devuelve
 * los top K ordenados por similitud desc.
 *
 * @param {number[]} queryVec
 * @param {Array<{embedding: number[], [k:string]: any}>} items
 * @param {object} opts
 * @param {number} [opts.topK=5]
 * @param {number} [opts.threshold=0]
 * @returns {Array<{item: any, score: number}>}
 */
function topKBySimilarity(queryVec, items, { topK = 5, threshold = 0 } = {}) {
  const scored = []
  for (const item of items) {
    if (!Array.isArray(item.embedding)) continue
    const score = cosineSimilarity(queryVec, item.embedding)
    if (score >= threshold) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

module.exports = { cosineSimilarity, topKBySimilarity }
