/**
 * EmbeddingsAdapter
 *
 * Genera embeddings localmente usando @xenova/transformers (modelo en ONNX).
 * - Singleton: una sola instancia del pipeline, inicializada lazy.
 * - El modelo se descarga la primera vez (~25MB) y queda en cache de Node.
 * - Salida normalizada L2 para que cosine similarity ≡ dot product.
 *
 * El método principal es `generateEmbedding(text)` que devuelve un array
 * de floats (Number[]) listo para serializar a JSON.
 */

const path  = require('path')
const config = require('../config')
const { makeLogger } = require('../utils/logger')

const log = makeLogger('embeddings')

// Cache del modelo en cache local (no re-descargar)
// @xenova/transformers respeta TRANSFORMERS_CACHE
process.env.TRANSFORMERS_CACHE =
  process.env.TRANSFORMERS_CACHE ||
  path.join(__dirname, '../../../data/transformers-cache')

class EmbeddingsAdapter {
  constructor() {
    /** @type {Promise<any> | null} Pipeline de feature-extraction (lazy) */
    this._pipelinePromise = null
    /** Cache simple en memoria: text → embedding (LRU mínimo) */
    this._cache = new Map()
    this._cacheLimit = 500
  }

  /** Carga el modelo la primera vez y reutiliza */
  async _getPipeline() {
    if (!this._pipelinePromise) {
      log.info(`Inicializando modelo: ${config.embeddings.model}`)
      const t0 = Date.now()
      this._pipelinePromise = (async () => {
        const { pipeline } = require('@xenova/transformers')
        const pipe = await pipeline('feature-extraction', config.embeddings.model, {
          quantized: true, // versión quantizada = más rápida, menor RAM
        })
        log.info(`Modelo listo en ${Date.now() - t0}ms`)
        return pipe
      })().catch(err => {
        // Si falla, dejar que el siguiente intento vuelva a probar
        this._pipelinePromise = null
        throw err
      })
    }
    return this._pipelinePromise
  }

  /**
   * Genera el embedding para un texto.
   * Devuelve Number[] (no Float32Array) para que JSON.stringify lo serialice.
   *
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') throw new Error('Texto vacío para generar embedding')

    const key = text.trim().slice(0, 512)
    if (this._cache.has(key)) return this._cache.get(key)

    const pipe = await this._getPipeline()
    const output = await pipe(key, {
      pooling:   config.embeddings.pooling,
      normalize: config.embeddings.normalize,
    })
    // output es un Tensor; .data es Float32Array
    const vector = Array.from(output.data)

    // Cache con eviction simple (FIFO)
    if (this._cache.size >= this._cacheLimit) {
      const firstKey = this._cache.keys().next().value
      this._cache.delete(firstKey)
    }
    this._cache.set(key, vector)

    return vector
  }

  /**
   * Versión batch — útil para sembrar embeddings de muchos servicios
   * sin pagar la latencia por llamada. Internamente serializa pero reusa
   * el modelo cargado.
   *
   * @param {string[]} texts
   * @returns {Promise<number[][]>}
   */
  async generateBatch(texts) {
    const out = []
    for (const t of texts) {
      out.push(await this.generateEmbedding(t))
    }
    return out
  }

  /** Libera cache en memoria (mantiene el modelo cargado) */
  clearCache() {
    this._cache.clear()
  }
}

// Singleton compartido en todo el proceso
const embeddingsAdapter = new EmbeddingsAdapter()

module.exports = { embeddingsAdapter, EmbeddingsAdapter }
