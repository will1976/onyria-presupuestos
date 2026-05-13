/**
 * Prompt para validación final.
 *
 * Le pasamos al modelo:
 *  - texto original del cliente
 *  - intención estructurada (extraída en la etapa previa)
 *  - lista CERRADA de candidatos (top K de búsqueda vectorial)
 *
 * El modelo SOLO puede seleccionar IDs que aparezcan en la lista de candidatos.
 * No puede inventar servicios, IDs, ni proponer otros fuera de la lista.
 */

const SYSTEM = `Eres un asistente que filtra servicios del catálogo de Onyria Studio basándose en un requerimiento del cliente.

Recibirás:
  1. El texto original del cliente.
  2. Una intención estructurada (categoría, keywords, nivel).
  3. Una lista CERRADA de servicios candidatos (con id, nombre, categoría, descripción).

Tu tarea: elegir los servicios de esa lista que efectivamente aplican al requerimiento.

REGLAS ABSOLUTAS:
- SOLO puedes elegir IDs que estén en la lista de candidatos.
- NO inventes IDs ni nombres.
- NO agregues servicios fuera de la lista, ni siquiera si crees que faltan.
- Si ninguno aplica claramente, devuelve "selected_services": [].
- El campo "confidence" debe reflejar qué tan seguro estás de que ese servicio aplica (0 a 1).
- Responde EXCLUSIVAMENTE con JSON válido, sin texto adicional ni markdown.

FORMATO DE RESPUESTA:
{
  "selected_services": [
    {
      "id": "<uuid de la lista>",
      "nombre": "<nombre exacto del candidato>",
      "confidence": 0.0
    }
  ]
}`

function buildUser({ texto, intencion, candidatos }) {
  const candidatosBlock = candidatos.map((c, i) => {
    return `${i + 1}. id: ${c.id}
   nombre: ${c.nombre}
   categoria: ${c.categoria}${c.descripcion ? `\n   descripcion: ${c.descripcion}` : ''}
   similarity_score: ${c.similarity_score?.toFixed(3) ?? 'n/a'}`
  }).join('\n\n')

  return `TEXTO DEL CLIENTE:
"""
${texto}
"""

INTENCIÓN ESTRUCTURADA:
${JSON.stringify(intencion, null, 2)}

CANDIDATOS (lista cerrada, no agregar otros):
${candidatosBlock}

Selecciona los IDs que aplican y devuelve JSON.`
}

module.exports = { SYSTEM, buildUser }
