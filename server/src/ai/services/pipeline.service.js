/**
 * Pipeline IA v2 — orquestador.
 *
 * Etapas:
 *   1. normalizeUserInput      → texto limpio
 *   2. extractStructuredIntent → categoría, keywords, complejidad, confianza
 *   3. findRelevantServices    → top K por cosine similarity
 *   4. validateAndSelect       → IA decide cuáles aplican (lista cerrada)
 *   5. classifyResults         → reglas de negocio (auto/sugerir/manual)
 *
 * Devuelve un objeto rico con todo el detalle para que el endpoint pueda
 * construir la respuesta y para que el frontend pueda mostrar trazabilidad.
 */

const { normalizeUserInput }      = require('./normalizer.service')
const { extractStructuredIntent } = require('./intent.service')
const { findRelevantServices }    = require('./search.service')
const { validateAndSelect }       = require('./validator.service')
const config                      = require('../config')
const { makeLogger }              = require('../utils/logger')
const { serviciosRepo }           = require('../../repositories')

const log = makeLogger('pipeline')

/**
 * Clasifica un servicio seleccionado según el threshold de auto/sugerir.
 */
function classifyConfidence(confidence) {
  if (confidence >= config.search.autoSelectThreshold) return 'auto'
  if (confidence >= config.search.suggestThreshold)    return 'suggest'
  return 'manual'
}

/**
 * Ejecuta el pipeline completo sobre un texto del usuario.
 *
 * @param {string} rawText
 * @returns {Promise<object>}
 */
async function runPipeline(rawText) {
  const trace = { steps: [], started_at: new Date().toISOString() }

  // 1. Normalizar
  const t0 = Date.now()
  const text = normalizeUserInput(rawText)
  trace.steps.push({ name: 'normalize', ms: Date.now() - t0, output_len: text.length })

  if (!text || text.length < 5) {
    return {
      ok: false,
      error: 'TEXT_TOO_SHORT',
      message: 'El texto es demasiado corto para analizar',
      trace,
    }
  }

  // 2. Extraer intención
  const t1 = Date.now()
  const intencion = await extractStructuredIntent(text)
  trace.steps.push({ name: 'intent', ms: Date.now() - t1, intent: intencion })

  // 3. Búsqueda vectorial
  const t2 = Date.now()
  const candidatos = await findRelevantServices(text, {
    categoria: intencion.categoria || undefined,
  })
  trace.steps.push({
    name: 'search',
    ms: Date.now() - t2,
    candidatos: candidatos.length,
    top_score: candidatos[0]?.similarity_score ?? null,
  })

  // 4. Validación final
  const t3 = Date.now()
  const seleccionados = await validateAndSelect({
    texto: text,
    intencion,
    candidatos,
  })
  trace.steps.push({ name: 'validate', ms: Date.now() - t3, seleccionados: seleccionados.length })

  // 5. Reglas de negocio + enriquecimiento con datos del catálogo
  const enriched = seleccionados.map(sel => {
    const fullService = serviciosRepo.findById(sel.id)
    return {
      id:               sel.id,
      nombre:           sel.nombre,
      categoria:        fullService?.categoria       ?? null,
      descripcion:      fullService?.descripcion     ?? null,
      precio_base:      fullService?.precio_base     ?? 0,
      porcentaje_boleta:fullService?.porcentaje_boleta ?? 0,
      unidad:           fullService?.unidad          ?? 'por pieza',
      moneda:           fullService?.moneda          ?? 'CLP',
      confidence:       sel.confidence,
      action:           classifyConfidence(sel.confidence),
    }
  })

  trace.finished_at = new Date().toISOString()
  trace.total_ms    = Date.now() - t0

  return {
    ok: true,
    intent:               intencion,
    candidates:           candidatos,
    selected_services:    enriched,
    requires_confirmation: enriched.some(e => e.action === 'suggest'),
    trace,
  }
}

module.exports = { runPipeline, classifyConfidence }
