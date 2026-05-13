/**
 * Job: generar embeddings de los servicios activos.
 *
 * Combina: nombre + categoria + descripcion (+ aliases/tags si están)
 * y genera un embedding por servicio, guardándolo en `servicios.embedding`
 * (JSON serializado vía el repositorio).
 *
 * Por default NO recalcula embeddings existentes. Pasa `{ force: true }`
 * para reprocesar todo (útil si cambia el modelo o los textos).
 *
 * Uso programático:
 *   const { generateServiceEmbeddings } = require('./jobs/generateServiceEmbeddings')
 *   await generateServiceEmbeddings({ force: false })
 *
 * Uso CLI:
 *   node src/ai/jobs/generateServiceEmbeddings.js          # solo faltantes
 *   node src/ai/jobs/generateServiceEmbeddings.js --force  # todos
 */

const { embeddingsAdapter } = require('../adapters/embeddings.adapter')
const { serviciosRepo }     = require('../../repositories')
const { makeLogger }        = require('../utils/logger')

const log = makeLogger('jobs:embed')

/**
 * Construye el texto que se vectoriza por servicio.
 * Orden: nombre + categoria + descripcion. Aliases/tags si están.
 */
function buildEmbeddingText(s) {
  const parts = [
    s.nombre,
    s.categoria,
    s.descripcion,
  ].filter(Boolean)

  if (Array.isArray(s.aliases) && s.aliases.length) parts.push(s.aliases.join(' '))
  if (Array.isArray(s.tags)    && s.tags.length)    parts.push(s.tags.join(' '))

  return parts.join('. ').slice(0, 1000)
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.force=false]
 * @returns {Promise<{processed:number, skipped:number, errors:number}>}
 */
async function generateServiceEmbeddings({ force = false } = {}) {
  const servicios = serviciosRepo.listarActivos()
  log.info(`Servicios activos: ${servicios.length}${force ? ' (force=true)' : ''}`)

  let processed = 0
  let skipped   = 0
  let errors    = 0
  const t0 = Date.now()

  for (const s of servicios) {
    if (!force && Array.isArray(s.embedding) && s.embedding.length > 0) {
      skipped++
      continue
    }

    const text = buildEmbeddingText(s)
    try {
      const vec = await embeddingsAdapter.generateEmbedding(text)
      serviciosRepo.setEmbedding(s.id, vec)
      processed++
      if (processed % 10 === 0) log.info(`  ... ${processed}/${servicios.length}`)
    } catch (err) {
      errors++
      log.error(`Error embedding "${s.nombre}":`, err.message)
    }
  }

  log.info(`Listo: ${processed} procesados, ${skipped} saltados, ${errors} errores (${Date.now() - t0}ms)`)
  return { processed, skipped, errors }
}

// CLI
if (require.main === module) {
  const force = process.argv.includes('--force')
  generateServiceEmbeddings({ force })
    .then(r => {
      console.log(JSON.stringify(r, null, 2))
      process.exit(0)
    })
    .catch(err => {
      console.error('Job falló:', err)
      process.exit(1)
    })
}

module.exports = { generateServiceEmbeddings, buildEmbeddingText }
