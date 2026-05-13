/**
 * Job: generar embeddings de los servicios activos.
 *
 * Texto que se vectoriza por servicio (en este orden, separado por '. '):
 *   - nombre
 *   - categoria
 *   - subcategoria
 *   - descripcion
 *   - aliases   (CSV → joined)
 *   - tags      (CSV → joined)
 *   - casos_uso
 *   - no_aplica → prefijo "NO RELACIONADO CON:" para separar semánticamente
 *
 * Por default NO recalcula embeddings existentes. Pasa `{ force: true }`
 * para reprocesar todo.
 *
 * Uso programático:
 *   const { generateServiceEmbeddings, rebuildAllEmbeddings } = require('./jobs/...')
 *   await generateServiceEmbeddings({ force: false })
 *   await rebuildAllEmbeddings()  // alias de force=true
 *
 * Uso CLI:
 *   node src/ai/jobs/generateServiceEmbeddings.js          # solo faltantes
 *   node src/ai/jobs/generateServiceEmbeddings.js --force  # todos
 */

const { embeddingsAdapter }   = require('../adapters/embeddings.adapter')
const { serviciosRepo }       = require('../../repositories')
const { csvToList, cleanText } = require('../utils/textNormalizer')
const { makeLogger }          = require('../utils/logger')

const log = makeLogger('jobs:embed')

/**
 * Construye el texto que se vectoriza para un servicio dado.
 * Ignora campos vacíos, dedupe aliases/tags, limita longitud.
 */
function buildEmbeddingText(s) {
  const partes = []

  if (s.nombre)       partes.push(cleanText(s.nombre))
  if (s.categoria)    partes.push(cleanText(s.categoria))
  if (s.subcategoria) partes.push(cleanText(s.subcategoria))
  if (s.descripcion)  partes.push(cleanText(s.descripcion))

  const aliases = csvToList(s.aliases)
  if (aliases.length) partes.push(aliases.join(', '))

  const tags = csvToList(s.tags)
  if (tags.length)    partes.push(tags.join(', '))

  if (s.casos_uso)    partes.push(cleanText(s.casos_uso))

  // no_aplica con prefijo explícito para que el modelo separe semánticamente
  const noAplica = csvToList(s.no_aplica)
  if (noAplica.length) {
    partes.push('NO RELACIONADO CON: ' + noAplica.join(', '))
  }

  // Concatenar con punto-espacio para que el tokenizer lo trate como oraciones
  // Limite generoso porque ahora hay más campos
  return partes.join('. ').slice(0, 2000)
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.force=false]
 * @param {(progress:{done:number,total:number,nombre:string})=>void} [opts.onProgress]
 * @returns {Promise<{processed:number, skipped:number, errors:number}>}
 */
async function generateServiceEmbeddings({ force = false, onProgress } = {}) {
  const servicios = serviciosRepo.listarActivos()
  log.info(`Servicios activos: ${servicios.length}${force ? ' (force=true)' : ''}`)

  let processed = 0
  let skipped   = 0
  let errors    = 0
  const t0 = Date.now()

  for (let i = 0; i < servicios.length; i++) {
    const s = servicios[i]

    if (!force && Array.isArray(s.embedding) && s.embedding.length > 0) {
      skipped++
      continue
    }

    const text = buildEmbeddingText(s)
    if (!text) {
      skipped++
      continue
    }

    try {
      const vec = await embeddingsAdapter.generateEmbedding(text)
      serviciosRepo.setEmbedding(s.id, vec)
      processed++
      if (onProgress) onProgress({ done: i + 1, total: servicios.length, nombre: s.nombre })
      if (processed % 10 === 0) log.info(`  ... ${processed}/${servicios.length}`)
    } catch (err) {
      errors++
      log.error(`Error embedding "${s.nombre}":`, err.message)
    }
  }

  log.info(`Listo: ${processed} procesados, ${skipped} saltados, ${errors} errores (${Date.now() - t0}ms)`)
  return { processed, skipped, errors }
}

/**
 * Atajo: regenera embeddings de TODOS los servicios activos (force=true).
 */
function rebuildAllEmbeddings(opts = {}) {
  return generateServiceEmbeddings({ ...opts, force: true })
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

module.exports = { generateServiceEmbeddings, rebuildAllEmbeddings, buildEmbeddingText }
