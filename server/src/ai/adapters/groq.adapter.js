/**
 * GroqAdapter
 *
 * Wrapper sobre groq-sdk con:
 *  - Singleton del cliente
 *  - Modo JSON forzado (response_format: json_object) para parseo determinista
 *  - Manejo unificado de rate limits y errores
 *  - Logging de tokens/latencia para observabilidad
 *
 * No contiene lógica de prompts; eso vive en server/src/ai/prompts/*.
 */

const config = require('../config')
const { makeLogger } = require('../utils/logger')

const log = makeLogger('groq')

class GroqAdapter {
  constructor() {
    /** @type {any} cliente Groq (lazy) */
    this._client = null
  }

  _getClient() {
    if (this._client) return this._client
    if (!config.groq.apiKey) {
      throw new Error('GROQ_API_KEY no configurada')
    }
    const Groq = require('groq-sdk')
    this._client = new Groq({ apiKey: config.groq.apiKey })
    return this._client
  }

  /**
   * Llama al modelo en modo JSON. Devuelve el JSON ya parseado.
   *
   * @param {object} opts
   * @param {string} opts.system               Mensaje system / prompt base
   * @param {string} opts.user                 Mensaje del usuario
   * @param {object} [opts.schemaHint]         Schema mostrado al modelo (opcional, va en system)
   * @param {number} [opts.temperature]
   * @param {number} [opts.maxTokens]
   * @returns {Promise<object>}
   */
  async chatJson({ system, user, temperature, maxTokens }) {
    const client = this._getClient()
    const t0 = Date.now()

    let completion
    try {
      completion = await client.chat.completions.create({
        model: config.groq.model,
        temperature: temperature ?? config.groq.temperature,
        max_tokens:  maxTokens   ?? config.groq.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user },
        ],
      })
    } catch (err) {
      if (err.status === 429 || /rate.?limit/i.test(err.message)) {
        throw new RateLimitError(err.message)
      }
      throw err
    }

    const content = completion.choices?.[0]?.message?.content || '{}'
    const usage   = completion.usage || {}
    log.debug(`chatJson ${Date.now() - t0}ms`, usage)

    try {
      return JSON.parse(content)
    } catch (err) {
      // El modo JSON debería garantizar válido, pero por si acaso
      throw new InvalidJsonError(
        `Respuesta de Groq no es JSON válido: ${content.slice(0, 200)}`,
      )
    }
  }
}

class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError'; this.code = 'RATE_LIMIT' }
}
class InvalidJsonError extends Error {
  constructor(msg) { super(msg); this.name = 'InvalidJsonError'; this.code = 'INVALID_JSON' }
}

const groqAdapter = new GroqAdapter()

module.exports = { groqAdapter, GroqAdapter, RateLimitError, InvalidJsonError }
