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
- "S.I." o "SI" = Sonido Internacional / sonido original de cámara que debe reemplazarse → servicio: Sonorización/Post
- "armado" = edición o montaje de una pieza audiovisual (spot, comercial, video)
- "catex" o "CATEX" = pieza publicitaria de catálogo de productos (supermercado, retail)
- "locu" o "locución" = voice-over, narración en off
- "voz en off" = locución / voice-over
- "lipsync" o "lip sync" = sincronización de labios con audio → servicio: ajuste de lipsync
- "mezcla" = mix de audio (diálogos, música, efectos) → Mezcla de Sonido
- "diseño sonoro" = creación de efectos de sonido, ambientes → Diseño Sonoro
- "SFX" = efectos de sonido
- "BG" o "background" = música de fondo o ambiente
- "master" o "mastering" = masterización de audio
- "formatos de entrega" = versiones del video en distintos aspect ratios (16:9, 9:16, 1:1, 4:5, etc.)
- "off" = narración en off (locución)
- "casting de voces" = selección de locutores → Casting
- "doblaje" = grabación de diálogos en otro idioma
- "ADR" = grabación de diálogos de reemplazo
- "foley" = efectos de sonido grabados en sincronía
- "stem" = pista separada de audio (música, efectos, diálogos)
- "versión" o "alt" = alternativa (Alt. 1, Alt. 2 = versiones distintas)
`

// ── SYSTEM prompt (instrucciones fijas, no cambian por texto) ──────────────
const SYSTEM_PROMPT = `Eres un experto en postproducción de audio para publicidad y contenido audiovisual, trabajando para Onyria Studio en Santiago de Chile.

Tu única función es analizar textos de solicitud de clientes (emails, briefs, WhatsApp, etc.) y devolver un JSON estructurado con los servicios detectados, cruzados contra el catálogo provisto.

${GLOSARIO}

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. Extrae TODOS los servicios mencionados, explícitos e implícitos.
2. Si un servicio se repite en distintos formatos o versiones, crea un ítem por cada variante o usa la cantidad correcta.
3. "S.I." siempre implica sonorización/post del armado.
4. Cada formato de entrega distinto (16:9, 9:16, 1:1, 4:5, etc.) NO es un servicio separado: es una nota técnica del servicio principal.
5. Cada locución o voz diferente ES un ítem separado.
6. Cada "Alt." (alternativa) de texto para locución ES una locución separada, a menos que sea el mismo locutor leyendo alternativas (en ese caso, una sola locución con notas).
7. "lipsync" es un servicio técnico separado de la locución.
8. Cuando el cliente menciona un nombre propio para la locución (ej: "locu de Mario"), anótalo en notas_tecnicas.
9. Usa la información del catálogo para encontrar el match más cercano. Si hay dudas entre dos ítems del catálogo, elige el más específico.
10. El campo "cantidad" debe ser un número entero positivo que refleje cuántas unidades se solicitan.
11. Si el texto no menciona datos del cliente (nombre, empresa, email, teléfono), deja esos campos vacíos — NO inventes datos.
12. Si no hay fecha de entrega explícita pero hay un mes mencionado, usa formato "YYYY-MM" o el texto tal como aparece.
13. El campo "fragmento_texto" DEBE contener la cita textual del cliente que justifica ese servicio. Si el fragmento es largo, recorta a la parte más relevante (máximo 120 caracteres). Usa "…" si recortas.

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

ESTRUCTURA JSON REQUERIDA (devuelve exactamente esto):
{
  "cliente": { "nombre": "", "empresa": "", "email": "", "telefono": "" },
  "proyecto": { "nombre": "", "tipo": "", "descripcion": "", "fecha_entrega": "" },
  "servicios": [
    {
      "nombre_servicio": "nombre descriptivo del servicio",
      "categoria": "categoria_valida",
      "descripcion_detalle": "qué se solicita exactamente",
      "fragmento_texto": "copia textual exacta de la parte del texto del cliente que origina este servicio",
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

Analiza el texto anterior y produce el JSON. Recuerda: SOLO el JSON, nada más.`
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
