/**
 * Logger mínimo para el pipeline IA.
 * No pretende ser pino/winston; solo namespace + niveles consistentes.
 */
function makeLogger(namespace) {
  const prefix = `[ai:${namespace}]`
  return {
    info:  (...args) => console.log(prefix, ...args),
    warn:  (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    debug: (...args) => {
      if (process.env.AI_DEBUG === 'true') console.log(prefix, ...args)
    },
  }
}

module.exports = { makeLogger }
