/**
 * Validación final IA.
 *
 * Toma el texto original, la intención estructurada y la lista CERRADA de
 * candidatos encontrados por búsqueda vectorial, y le pide al modelo
 * (Groq) que SELECCIONE cuáles de esos candidatos aplican.
 *
 * El modelo NO puede inventar IDs ni nombres. Si lo intenta, este servicio
 * filtra cualquier ID que no esté en los candidatos originales.
 */

const { groqAdapter }     = require('../adapters/groq.adapter')
const validatorPrompt     = require('../prompts/validator.prompt')
const { makeLogger }      = require('../utils/logger')

const log = makeLogger('validator')

/**
 * @param {object} args
 * @param {string} args.texto
 * @param {object} args.intencion
 * @param {Array<{id:string, nombre:string, categoria:string, descripcion:string, similarity_score:number}>} args.candidatos
 * @returns {Promise<Array<{id:string, nombre:string, confidence:number}>>}
 */
async function validateAndSelect({ texto, intencion, candidatos }) {
  if (!candidatos.length) return []

  const idsValidos = new Set(candidatos.map(c => c.id))
  const idToName   = new Map(candidatos.map(c => [c.id, c.nombre]))

  let raw
  try {
    raw = await groqAdapter.chatJson({
      system: validatorPrompt.SYSTEM,
      user:   validatorPrompt.buildUser({ texto, intencion, candidatos }),
      temperature: 0.1,
      maxTokens: 800,
    })
  } catch (err) {
    log.warn('Validación final IA falló, devolviendo candidatos por score:', err.message)
    // Fallback: top 3 candidatos por similitud como auto-selección
    return candidatos.slice(0, 3).map(c => ({
      id: c.id,
      nombre: c.nombre,
      confidence: c.similarity_score,
    }))
  }

  const selected = Array.isArray(raw.selected_services) ? raw.selected_services : []

  // Filtrar IDs inventados — sólo dejar los que están en la lista de candidatos
  const validados = selected
    .filter(s => s && typeof s.id === 'string' && idsValidos.has(s.id))
    .map(s => ({
      id:         s.id,
      nombre:     idToName.get(s.id),  // forzamos el nombre real, no el del modelo
      confidence: typeof s.confidence === 'number'
        ? Math.max(0, Math.min(1, s.confidence))
        : 0.5,
    }))

  if (selected.length !== validados.length) {
    log.warn(`IA propuso ${selected.length} servicios pero ${selected.length - validados.length} no estaban en candidatos (descartados)`)
  }

  return validados
}

module.exports = { validateAndSelect }
