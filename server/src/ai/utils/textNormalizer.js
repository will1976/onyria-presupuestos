/**
 * Utilidades para normalizar el texto que va a embeddings.
 *
 *  - csvToList(text)      → CSV/textarea libre → array limpio, sin duplicados
 *  - joinUnique(...lists) → concatena varias listas dedupeando case-insensitive
 *  - cleanText(str)       → trim, colapso de espacios y normaliza saltos
 */

/** Acepta string CSV ("a, b, c"), array, o null/undefined. Devuelve array limpio. */
function csvToList(text) {
  if (!text) return []
  if (Array.isArray(text)) {
    return dedupe(text.map(s => String(s).trim()).filter(Boolean))
  }
  return dedupe(
    String(text)
      .split(/[,\n;]+/)        // separa por coma, salto de línea o punto y coma
      .map(s => s.trim())
      .filter(Boolean),
  )
}

/** Concatena listas y devuelve un array único (case-insensitive) preservando orden */
function joinUnique(...lists) {
  const out  = []
  const seen = new Set()
  for (const lst of lists) {
    if (!Array.isArray(lst)) continue
    for (const v of lst) {
      const key = String(v).toLowerCase().trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(v)
    }
  }
  return out
}

function dedupe(arr) {
  const seen = new Set()
  const out  = []
  for (const v of arr) {
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

function cleanText(s) {
  if (s == null) return ''
  return String(s).replace(/\s+/g, ' ').trim()
}

module.exports = { csvToList, joinUnique, cleanText, dedupe }
