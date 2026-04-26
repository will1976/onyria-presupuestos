const Groq = require('groq-sdk')

let client = null

function getClient() {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY no configurada en variables de entorno')
    client = new Groq({ apiKey })
  }
  return client
}

// ── Glosario del rubro (chileno / latinoamericano) ─────────────────────────
const GLOSARIO = `
GLOSARIO DEL RUBRO AUDIO/POSTPRODUCCIÓN (Chile / Latinoamérica):
- "S.I." o "SI" = Sonido Internacional / sonido original de cámara que debe reemplazarse → implica: Sonorización
- "armado" = edición/montaje de una pieza audiovisual (spot, comercial, video) → implica: Edición
- "catex" o "CATEX" = pieza publicitaria de catálogo de productos (supermercado, retail)
- "locu" o "locución" o "off" o "voz en off" = voice-over, narración. Si dice "locu de [Nombre]" ese es el locutor asignado
- "lipsync" o "lip sync" = sincronización de labios con audio → servicio: Ajuste de Lipsync (SIEMPRE separado)
- "mix" o "mezcla" = Mix de audio final (diálogos, música, efectos). La duración indicada (ej: 15seg) define el mix
- "master" o "mastering" = Masterización de audio → SIEMPRE va junto al mix
- "formatos de entrega" = versiones del video en distintos aspect ratios (16:9, 9:16, 1:1, 4:5…) → implica: Entrega de Archivos (un solo servicio)
- "casting de voces" = selección de locutores → Casting + Honorarios de personajes (DOS servicios separados)
- "voces distintas" o "personajes distintos" = implica Casting + Honorarios para cada personaje
- "ajuste" o "corrección" = revisiones sobre el entregable → Ajustes de texto/imagen
- "derechos" = licencia de uso en medios → Derechos de uso (en publicidad siempre se cobra)
- "Alt." = alternativa de texto/versión; múltiples Alt. del mismo locutor = UNA locución con notas, no varias
- "SFX" = efectos de sonido
- "BG" o "background" = música de fondo o ambiente
- "stem" = pista separada de audio
- "doblaje" = grabación de diálogos en otro idioma
- "ADR" = grabación de diálogos de reemplazo
- "foley" = efectos de sonido grabados en sincronía
`

// ── CADENA DE PRODUCCIÓN IMPLÍCITA ─────────────────────────────────────────
const CADENA_PRODUCCION = `
CADENA DE PRODUCCIÓN — SERVICIOS IMPLÍCITOS:
Cuando el cliente pide un "armado" o "spot" o "catex" o cualquier pieza audiovisual, SIEMPRE están implícitos estos servicios aunque no los mencione explícitamente:
  1. Edición (el armado en sí)
  2. Sonorización (si hay "S.I." o se menciona cambio de audio de cámara)
  3. Mix de audio (por la duración indicada: 15seg, 30seg, etc.)
  4. Masterización (siempre acompaña al mix)
  5. Entrega de Archivos (si hay múltiples formatos de entrega: 16:9, 9:16, 1:1, 4:5…)

Cuando el cliente pide "voces en off" o "locutores" o "personajes" o "casting":
  1. Casting de voces (selección, N personajes = cantidad N)
  2. Honorarios de personajes (lo que se paga al actor/locutor contratado, misma cantidad)
  3. Locución (la grabación en sí, por locutor o por texto)

Cuando el cliente menciona "ajustes" o revisiones:
  - Agregar "Ajustes de texto/imagen" con la cantidad mencionada (ej: "hasta 2 ajustes" → cantidad 2)

Para piezas publicitarias (catex, spot, comercial), los Derechos de uso son estándar:
  - Si el cliente menciona un período (ej: "1 mes", "3 meses") → agregar Derechos por ese período
  - Si no menciona período, NO agregar Derechos (esperar confirmación)
`

// ── SYSTEM prompt (instrucciones fijas, no cambian por texto) ──────────────
const SYSTEM_PROMPT = `Eres un experto en postproducción de audio para publicidad y contenido audiovisual, trabajando para Onyria Studio en Santiago de Chile.

Tu única función es analizar textos de solicitud de clientes (emails, briefs, WhatsApp, etc.) y devolver un JSON estructurado con TODOS los servicios detectados, tanto explícitos como implícitos, cruzados contra el catálogo provisto.

${GLOSARIO}

${CADENA_PRODUCCION}

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. Extrae TODOS los servicios, tanto los mencionados directamente como los IMPLÍCITOS según la cadena de producción.
2. "S.I." siempre implica el servicio de Sonorización — inclúyelo aunque no esté en el catálogo.
3. Un "armado de Xseg" siempre implica: Edición + Mix de Xseg + Masterización.
4. Múltiples formatos de entrega (16:9, 9:16, 1:1, 4:5…) = UN solo servicio "Entrega de Archivos", no uno por formato.
5. "N voces distintas" o "N personajes" = Casting (cantidad N) + Honorarios personajes (cantidad N).
6. Si el cliente nombra un locutor específico (ej: "locu de Mario"), agregar Locución con ese nombre en notas_tecnicas.
7. Múltiples "Alt." de texto para el MISMO locutor = UNA sola locución (anotar las alternativas en notas_tecnicas).
8. "lipsync" es SIEMPRE un servicio separado de la locución.
9. Usa el catálogo para encontrar el match más cercano (catalogo_id). Si no hay match exacto, usa el más similar por categoría.
10. El campo "cantidad" debe ser un número entero positivo.
11. Si el texto no menciona datos del cliente (nombre, empresa, email, teléfono), deja esos campos vacíos — NO inventes datos.
12. Si hay un mes mencionado como fecha (ej: "sale en Mayo"), úsalo como fecha_entrega.
13. El campo "fragmento_texto" DEBE contener la cita textual más relevante (máximo 120 caracteres, usa "…" si recortas).
14. Sé consistente: el mismo input debe producir siempre el mismo output.

FORMATO DE RESPUESTA: Devuelve ÚNICAMENTE el JSON, sin markdown, sin bloques de código, sin texto antes o después.`

// ── USER prompt (incluye catálogo + texto a analizar) ─────────────────────
function buildUserPrompt(texto, catalogo) {
  const catalogoStr = catalogo.length > 0
    ? catalogo.map(s =>
        `  [${s.id}] "${s.nombre}" | cat: ${s.categoria} | precio: ${s.precio_base} ${s.moneda} | unidad: ${s.unidad}`
      ).join('\n')
    : '  (catálogo vacío — no hay servicios cargados aún)'

  return `CATÁLOGO DE SERVICIOS (usa los IDs exactos para el campo catalogo_id):
${catalogoStr}

CATEGORÍAS VÁLIDAS para el campo "categoria":
sonorizacion | locucion | musica_original | musica_archivo | casting | podcast | otro

EJEMPLO DE SERVICIOS QUE SE ESPERAN PARA UN CATEX TÍPICO CON VOCES:
Si el cliente pide: "armado de 15seg con S.I., 3 voces en off distintas, lipsync, entrega en 4 formatos, locu de Mario"
Entonces el JSON debe incluir (en este orden aproximado):
  1. Locución — locutor Mario (notas: nombre del locutor)
  2. Edición — montaje del armado
  3. Sonorización — reemplazo de S.I.
  4. Casting — 3 personajes (cantidad: 3)
  5. Honorarios personajes — 3 actores (cantidad: 3)
  6. Ajustes — revisiones incluidas (si se mencionan)
  7. Mix de 15" — mezcla final
  8. Masterización — siempre acompaña al mix
  9. Entrega de Archivos — múltiples formatos (16:9, 9:16, 1:1, 4:5)
  10. Ajuste de Lipsync — si se menciona lipsync
  11. Derechos de uso — solo si el cliente indica el período

ESTRUCTURA JSON REQUERIDA (devuelve exactamente esto):
{
  "cliente": { "nombre": "", "empresa": "", "email": "", "telefono": "" },
  "proyecto": { "nombre": "", "tipo": "", "descripcion": "", "fecha_entrega": "" },
  "servicios": [
    {
      "nombre_servicio": "nombre descriptivo del servicio",
      "categoria": "categoria_valida",
      "descripcion_detalle": "qué se solicita exactamente",
      "fragmento_texto": "cita textual del cliente que origina este servicio (máx 120 chars)",
      "cantidad": 1,
      "unidad": "por pieza",
      "notas_tecnicas": "specs, formatos, nombres, alternativas",
      "catalogo_id": "uuid-del-catalogo-o-null",
      "catalogo_nombre": "nombre exacto del catálogo o null",
      "precio_unitario": 0,
      "moneda": "CLP"
    }
  ],
  "observaciones_generales": "contexto o notas relevantes no cubiertas en los servicios"
}

TEXTO DEL CLIENTE A ANALIZAR:
---
${texto}
---

Recuerda: aplica la cadena de producción implícita. Si ves "armado", agrega Edición + Mix + Masterización. Si ves "S.I.", agrega Sonorización. Si ves formatos de entrega, agrega Entrega de Archivos. Si ves voces/personajes, agrega Casting + Honorarios. Devuelve SOLO el JSON.`
}

// ── Función principal ──────────────────────────────────────────────────────
async function analizarConCatalogo(texto, catalogo) {
  const groq = getClient()

  const completion = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0,       // máximo determinismo
    top_p:       1,
    seed:        42,      // reproducibilidad entre llamadas
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserPrompt(texto, catalogo) },
    ],
    response_format: { type: 'json_object' }, // fuerza JSON válido
  })

  const text = completion.choices[0]?.message?.content?.trim() || ''

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    // Fallback: strip accidental markdown fences
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    try {
      parsed = JSON.parse(clean)
    } catch {
      console.error('[groq] JSON parse error:', text.slice(0, 300))
      throw new Error('La IA no devolvió un JSON válido. Intenta con un texto más detallado.')
    }
  }

  return parsed
}

module.exports = { analizarConCatalogo }
