# Onyria Studio — Sistema de Presupuestos

Aplicación de escritorio (local single-user) para automatizar y profesionalizar el proceso de cotización de **Onyria Studio**, estudio tecnocreativo de audio inmersivo.

Pensada para correr en el PC del usuario final sin instalar PostgreSQL, sin Docker, sin servicios externos obligatorios.

---

## 🚀 Inicio rápido (Windows)

### Requisitos
- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- Conexión a internet **solo la primera vez** (descarga del modelo de embeddings)
- (Opcional) `GROQ_API_KEY` en `server/.env` si vas a usar el Análisis IA

### Un solo click: `iniciar.bat`

Desde la raíz del proyecto, **doble-click en `iniciar.bat`** y elige el pipeline IA:

```
==========================================
  ONYRIA STUDIO - Presupuestos
==========================================

Elige el pipeline de IA a utilizar:

  [1] Pipeline NUEVO v2 (recomendado)
      - Embeddings locales con xenova/transformers
      - Búsqueda semántica por cosine similarity
      - Validación estricta contra catálogo

  [2] Pipeline LEGACY
      - Solo Groq + fuzzy matching por palabras

Tu eleccion [1/2] (default: 1):
```

El `.bat`:
1. Instala dependencias si no existen (`npm install` automático)
2. Levanta backend (puerto **3001**) y frontend (puerto **5173**)
3. Abre el navegador en `http://localhost:5173` a los 10 segundos
4. Permite detener todo con `Ctrl+C`

### Desde la línea de comandos

```bash
# Instalar todo (solo la primera vez)
npm run install:all

# Modo desarrollo — pipeline IA legacy
npm run dev:local

# Modo desarrollo — pipeline IA v2 (con embeddings)
npm run dev:local:v2
```

---

## 🗂️ Estructura del proyecto

```
onyria-presupuestos/
├── iniciar.bat                              # Lanzador con menú interactivo
├── package.json                             # Workspaces raíz
│
├── client/                                  # React 18 + Vite
│   ├── public/
│   │   ├── header.png                       # Banner del PDF (preview)
│   │   ├── footer.png                       # Pie del PDF (preview)
│   │   └── logo.png
│   └── src/
│       ├── components/
│       │   ├── ui/                          # Badge, Button, Input, Modal, Toast...
│       │   ├── layout/                      # Sidebar, Header
│       │   └── pdf/PDFPreview.jsx           # Vista previa del PDF
│       ├── pages/                           # Dashboard, AnalisisIA, NuevoPresupuesto, etc
│       ├── services/                        # Axios HTTP wrappers
│       ├── hooks/
│       └── App.jsx
│
└── server/                                  # Node.js + Express
    ├── data/                                # ← SQLite local (gitignored)
    │   └── onyria.db
    └── src/
        ├── index.js                         # Entry point Express
        ├── config/                          # Env vars + defaults
        │
        ├── db/                              # ── Capa de persistencia ──
        │   ├── index.js                     # SQLite (better-sqlite3) + shim pg-compat
        │   ├── migrate.js                   # Runner de migraciones
        │   └── migrations-sqlite/
        │       ├── 001_init.sql             # Schema completo
        │       ├── 002_seed_servicios.sql   # 49 servicios del catálogo
        │       └── 003_metadata_semantica.sql
        │
        ├── repositories/                    # ── Patrón Repository ──
        │   ├── base.repo.js                 # CRUD genérico + JSON/boolean mapping
        │   ├── servicios.repo.js
        │   ├── clientes.repo.js
        │   └── presupuestos.repo.js
        │
        ├── controllers/                     # ── Rutas Express ──
        ├── routes/
        ├── middleware/
        │
        ├── ai/                              # ── Pipeline IA v2 ──
        │   ├── config.js                    # Thresholds, modelos, feature flag
        │   ├── adapters/
        │   │   ├── embeddings.adapter.js    # @xenova/transformers (singleton lazy)
        │   │   └── groq.adapter.js          # Groq SDK wrapper (JSON mode)
        │   ├── services/
        │   │   ├── normalizer.service.js    # normalizeUserInput
        │   │   ├── intent.service.js        # extractStructuredIntent (Groq)
        │   │   ├── search.service.js        # findRelevantServices (cosine)
        │   │   ├── validator.service.js     # validateAndSelect (Groq cerrado)
        │   │   └── pipeline.service.js      # Orquestador
        │   ├── prompts/
        │   │   ├── intent.prompt.js
        │   │   └── validator.prompt.js
        │   ├── utils/
        │   │   ├── cosine.js
        │   │   ├── textNormalizer.js
        │   │   └── logger.js
        │   └── jobs/
        │       └── generateServiceEmbeddings.js
        │
        ├── pdf/                             # ── Generación de PDF ──
        │   ├── pdf-generator.js             # Puppeteer + Handlebars + Sharp
        │   ├── presupuesto.adapter.js       # row DB → contexto del template
        │   ├── templates/quotation.hbs
        │   └── assets/
        │       ├── header.png               # Banner corporativo
        │       └── footer.png               # Pie corporativo
        │
        └── utils/                           # geminiClient.js (legacy), email parsers...
```

---

## 🗄️ Base de datos

**SQLite local** (`server/data/onyria.db`), sin servidor ni dependencias externas.

- **better-sqlite3**: driver síncrono, prebuilt binaries para Windows
- **Migraciones automáticas** al arrancar el server (idempotentes, registradas en tabla `_migrations`)
- **WAL mode** habilitado para concurrencia decente
- **API compatible con pg**: el shim en `db/index.js` traduce `$1, $2, ...` → `?` para mantener compatibilidad con los controladores legacy

### Tablas principales
| Tabla | Propósito |
|---|---|
| `servicios` | Catálogo de 49 servicios (con metadata semántica: aliases, tags, casos_uso, no_aplica, subcategoria, embedding) |
| `clientes` | Clientes con activo / soft delete |
| `presupuestos` | Cotizaciones con ajuste manual de total + motivo |
| `presupuesto_items` | Líneas de detalle por presupuesto |
| `service_feedback` | (preparada) feedback de IA para mejora continua |

### Cambiar la ubicación de la BD
```bash
# server/.env
DB_PATH=C:/Users/usuario/AppData/Local/Onyria/onyria.db
DB_VERBOSE=true   # opcional, loguea cada query SQL
```

---

## 🤖 Pipeline IA v2

Búsqueda semántica robusta sobre el catálogo de servicios, sin que el modelo invente servicios.

**Endpoints:**
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/ia/v2` | Pipeline completo (normalize → intent → search → validate) |
| GET | `/api/ia/v2/embeddings/status` | Estado del índice (cuántos servicios tienen embedding) |
| POST | `/api/ia/v2/embeddings/rebuild` | Regenerar (body: `{ force: true }`) |
| POST | `/api/ia/analizar` | Endpoint legacy (delega a v2 si `USE_NEW_AI_PIPELINE=true`) |

**Etapas del pipeline:**
1. **Normalizer** — limpia el texto del cliente (emojis, whitespace, control chars)
2. **Intent extractor** (Groq, JSON mode) — extrae categoría + keywords + nivel de complejidad + score de confianza
3. **Semantic search** — embedding local de la consulta + cosine similarity contra el catálogo. Top K resultados + boost por categoría matcheada
4. **Validator** (Groq, lista cerrada) — el modelo SOLO puede elegir IDs que estén en los candidatos; filtramos cualquier ID inventado
5. **Reglas de negocio** — `confidence ≥ 0.85` auto, `0.60 ≤ confidence < 0.85` requiere confirmación, `< 0.60` manual
6. **Feedback loop** (preparado) — tabla `service_feedback` para registrar correcciones del usuario

**Embeddings:** `@xenova/transformers` con `Xenova/all-MiniLM-L6-v2` (384 dim). Modelo se descarga la primera vez (~25MB) y queda cacheado en `server/data/transformers-cache/`. Cada servicio activo se vectoriza concatenando `nombre + categoría + subcategoría + descripción + aliases + tags + casos_uso + "NO RELACIONADO CON: " + no_aplica`.

**Variables de entorno relevantes:**
```bash
GROQ_API_KEY=gsk_...                       # requerido para intent/validator
GROQ_MODEL=llama-3.3-70b-versatile         # default
EMBEDDINGS_MODEL=Xenova/all-MiniLM-L6-v2   # default
SIMILARITY_THRESHOLD=0.35
TOP_K_CANDIDATES=5
AUTO_SELECT_THRESHOLD=0.85
SUGGEST_THRESHOLD=0.60
CATEGORY_BOOST_MULTIPLIER=1.15
USE_NEW_AI_PIPELINE=true                   # /api/ia/analizar delega a v2
```

---

## 📄 Generación de PDF

**Stack**: Puppeteer (Chromium headless) + Handlebars + Sharp.

- `header.png` y `footer.png` se inyectan via `displayHeaderFooter` de Puppeteer → se repiten en CADA página automáticamente
- El N° de cotización y la fecha se **bakean en `header.png` con Sharp** (SVG composite → JPEG q=85) porque Chromium ignora data URLs grandes en `headerTemplate`
- Contenido central en **flow layout** (sin `position:absolute` pixelado)
- Multi-página automática si los items / observaciones crecen

**API**:
```js
const { generarPDF } = require('./pdf/pdf-generator')
const buffer = await generarPDF(presupuestoRow)   // shape: el row de la BD
```

---

## 📡 API endpoints

### Presupuestos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/presupuestos` | Listar con filtros |
| GET | `/api/presupuestos/metricas` | Dashboard (total mes, suma CLP/USD, chart 6m) |
| GET | `/api/presupuestos/:id` | Detalle (con items) |
| POST | `/api/presupuestos` | Crear |
| PUT | `/api/presupuestos/:id` | Actualizar |
| PATCH | `/api/presupuestos/:id/estado` | Cambiar estado |
| DELETE | `/api/presupuestos/:id` | Eliminar |
| POST | `/api/presupuestos/:id/duplicar` | Duplicar |
| GET | `/api/presupuestos/:id/pdf` | **Descargar PDF** |

### Servicios
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/servicios` | Listar (filtros: categoria, activo, q) |
| GET | `/api/servicios/:id` | Detalle |
| POST | `/api/servicios` | Crear |
| PUT | `/api/servicios/:id` | Actualizar |
| DELETE | `/api/servicios/:id` | Eliminar (soft si está en uso) |

### Clientes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/clientes` | Listar |
| GET | `/api/clientes/:id` | Detalle |
| POST | `/api/clientes` | Crear |
| PUT | `/api/clientes/:id` | Actualizar |
| DELETE | `/api/clientes/:id` | Soft delete (activo=false) |

### IA
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/ia/v2` | Pipeline nuevo |
| GET | `/api/ia/v2/embeddings/status` | Estado del índice |
| POST | `/api/ia/v2/embeddings/rebuild` | Regenerar embeddings |
| POST | `/api/ia/analizar` | Legacy (delega a v2 si flag activo) |

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 18 + Vite 5 + estilos inline (dark theme custom) |
| **Backend** | Node.js 18+ + Express 4 (CommonJS) |
| **Base de datos** | SQLite (better-sqlite3) con shim de compatibilidad pg |
| **IA — LLM** | Groq SDK (Llama 3.3 70B Versatile) en JSON mode |
| **IA — Embeddings** | `@xenova/transformers` con `all-MiniLM-L6-v2` (384 dim, local) |
| **PDF** | Puppeteer + Handlebars + Sharp |
| **Excel** | xlsx (cliente, import/export servicios) + exceljs (server) |
| **Dev tools** | Concurrently, Nodemon (watching js/json/hbs), cross-env |

---

## 📋 Flujo de uso

1. **Dashboard** — métricas del mes, presupuestos recientes
2. **Análisis IA** — pegar texto del cliente → pipeline detecta servicios del catálogo
3. **Nuevo Presupuesto** — desde el análisis o desde cero, edita items y precios
4. **Vista Previa PDF** — preview HTML que espejea el PDF real
5. **Descargar PDF** — genera el PDF corporativo con header/footer fijos
6. **Servicios** — gestiona el catálogo (incluye import/export Excel y metadata semántica)
7. **Clientes** — gestiona la base de clientes
8. **Ayuda** — guía interna del sistema

---

## 🧰 Scripts útiles

```bash
# Generar/regenerar embeddings de los 49 servicios
node server/src/ai/jobs/generateServiceEmbeddings.js          # solo faltantes
node server/src/ai/jobs/generateServiceEmbeddings.js --force  # todos

# Resetear y recargar catálogo de servicios desde CSV
node server/src/db/scripts/reset_y_cargar_servicios.js

# Solo backend (sin frontend)
npm run dev:server:local            # legacy
npm run dev:server:local:v2         # pipeline v2

# Migrar manualmente
node server/src/db/migrate.js
```

---

## 🧪 Debug

```bash
# Loguea queries SQL en consola
DB_VERBOSE=true

# Loguea pasos internos del pipeline IA
AI_DEBUG=true

# Trazas del PDF (tiempos, etc) — ya se loguea por defecto
```

---

## 🔒 Seguridad

- Single-user local install: **no hay sistema de auth** activo en producción local
- Los archivos `server/.env` y `server/data/` están en `.gitignore`
- JWT y bcrypt están instalados pero solo se usaron en una versión previa con auth (código preservado en el repo por si se reactiva)

---

## 📜 Licencia

Uso interno de **Onyria Studio SpA** — Santa Magdalena 75 of 304, Providencia.
