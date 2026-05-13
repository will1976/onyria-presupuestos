/**
 * Extracción estructurada de intención usando Groq.
 *
 * Devuelve siempre un objeto con la forma:
 *   { categoria, keywords[], nivel_complejidad, confianza }
 * Si Groq falla o devuelve algo inválido, devuelve un objeto "vacío"
 * con confianza 0 (para que el pipeline pueda continuar con fallback).
 */

const { groqAdapter } = require('../adapters/groq.adapter')
const intentPrompt    = require('../prompts/intent.prompt')
const { makeLogger }  = require('../utils/logger')

const log = makeLogger('intent')

const CATEGORIAS_VALIDAS = new Set([
  'Estudio', 'Locutor', 'musica_original', 'musica_archivo',
  'renovacion_derecho', 'Personajes - Doblajes', 'podcast', '',
])
const NIVELES_VALIDOS = new Set(['bajo', 'medio', 'alto'])

/** Asegura que la respuesta del modelo cumpla el contrato esperado */
function sanitizeIntent(raw) {
  if (!raw || typeof raw !== 'object') {
    return { categoria: '', keywords: [], nivel_complejidad: 'medio', confianza: 0 }
  }

  const categoria = CATEGORIAS_VALIDAS.has(raw.categoria) ? raw.categoria : ''
  const keywords  = Array.isArray(raw.keywords)
    ? raw.keywords.filter(k => typeof k === 'string').slice(0, 10)
    : []
  const nivel     = NIVELES_VALIDOS.has(raw.nivel_complejidad) ? raw.nivel_complejidad : 'medio'
  const confianza = typeof raw.confianza === 'number'
    ? Math.max(0, Math.min(1, raw.confianza))
    : 0

  return {
    categoria,
    keywords,
    nivel_complejidad: nivel,
    confianza,
  }
}

/**
 * Llama a Groq y devuelve la intención estructurada.
 * @param {string} text  Ya normalizado
 * @returns {Promise<{categoria:string, keywords:string[], nivel_complejidad:string, confianza:number}>}
 */
async function extractStructuredIntent(text) {
  if (!text || !text.trim()) {
    return { categoria: '', keywords: [], nivel_complejidad: 'medio', confianza: 0 }
  }
  try {
    const raw = await groqAdapter.chatJson({
      system: intentPrompt.SYSTEM,
      user:   intentPrompt.buildUser(text),
      temperature: 0.1,
      maxTokens: 512,
    })
    const safe = sanitizeIntent(raw)
    log.debug('intent:', safe)
    return safe
  } catch (err) {
    log.warn('Falló extracción de intención, devolviendo intent vacío:', err.message)
    return { categoria: '', keywords: [], nivel_complejidad: 'medio', confianza: 0 }
  }
}

module.exports = { extractStructuredIntent, sanitizeIntent }
