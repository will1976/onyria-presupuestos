import { useState } from 'react'
import { iaService } from '../services/ia.service'
import { Button, Spinner, CategoriaPill } from '../components/ui'
import { GOLD, CYAN, BG_CARD, BG_BASE, BORDER, TEXT, TEXT_MUTED, TEXT_DIM, formatMonto } from '../components/theme'

const EXAMPLE_TEXT = `Hola equipo de Onyria,

Les escribo de parte de Netflix Chile. Estamos produciendo una nueva serie documental de 6 episodios de 45 minutos cada uno sobre la historia de la música latinoamericana.

Necesitamos:
- Mezcla en 5.1 para todos los episodios
- Diseño sonoro original (ambientes, efectos, música incidental)
- Versión Dolby Atmos para distribución en plataforma
- Doblaje al inglés para mercado estadounidense (narración principal)

Fecha límite de entrega: 15 de marzo de 2025.
El proyecto se llama "Ritmos del Sur".

Saludos,
Carolina Méndez
Productora Ejecutiva · Netflix Chile
carolina.mendez@netflix.com
+56 9 8765 4321`

export default function AnalisisIA({ onPresupuestoGenerado, addToast }) {
  const [texto,     setTexto]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error,     setError]     = useState('')

  async function analizar() {
    if (!texto.trim()) { setError('Pega el texto primero.'); return }
    setLoading(true); setError(''); setResultado(null)
    try {
      const data = await iaService.analizar(texto)
      setResultado(data.data)
      addToast('Texto analizado correctamente', 'success')
    } catch (err) {
      setError(err.message || 'Error al analizar.')
      addToast('Error en análisis IA', 'error')
    } finally {
      setLoading(false)
    }
  }

  function limpiar() { setTexto(''); setResultado(null); setError('') }

  const totalConPrecio  = resultado?.servicios?.filter(s => s.precio_unitario > 0).length || 0
  const totalSinPrecio  = resultado?.servicios?.filter(s => !s.precio_unitario).length || 0
  const totalEstimado   = resultado?.servicios?.reduce((acc, s) =>
    acc + (s.precio_unitario || 0) * (s.cantidad || 1), 0) || 0

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${CYAN}15`, border: `1px solid ${CYAN}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: CYAN,
          }}>◎</div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 600 }}>Análisis IA</h1>
        </div>
        <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 13 }}>
          Pega cualquier texto del cliente (email, brief, WhatsApp) y la IA detectará los servicios y los cruzará con el catálogo.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Input panel ── */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Texto del cliente
            </div>
            <Button size="sm" variant="ghost" onClick={() => setTexto(EXAMPLE_TEXT)} style={{ color: GOLD, fontSize: 11 }}>
              Cargar ejemplo
            </Button>
          </div>

          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Pega aquí el email, brief, o cualquier texto de solicitud del cliente..."
            style={{
              width: '100%', height: 300, background: BG_BASE, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: 14, color: TEXT, fontSize: 13, resize: 'vertical',
              outline: 'none', lineHeight: 1.7, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = CYAN + '60' }}
            onBlur={e => { e.target.style.borderColor = BORDER }}
          />

          {error && (
            <div style={{ color: '#EF4444', fontSize: 12, marginTop: 8, padding: '8px 10px', background: '#EF444410', borderRadius: 4, border: '1px solid #EF444425' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <Button onClick={analizar} loading={loading} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Analizando…' : '◎  Analizar con IA'}
            </Button>
            <Button variant="secondary" onClick={limpiar}>Limpiar</Button>
          </div>

          <div style={{ marginTop: 14, padding: '10px 12px', background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>¿CÓMO FUNCIONA?</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1.7 }}>
              La IA analiza el texto, detecta todos los servicios solicitados y los cruza automáticamente con el catálogo de Onyria para asignar precios y categorías.
            </div>
          </div>
        </div>

        {/* ── Result panel ── */}
        <div style={{
          background: BG_CARD,
          border: `1px solid ${resultado ? CYAN + '40' : BORDER}`,
          borderRadius: 10, padding: 24, transition: 'border-color 0.3s',
        }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 16 }}>
            Resultado del Análisis
          </div>

          {!resultado && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
              <div style={{ fontSize: 52, opacity: 0.12 }}>◎</div>
              <div style={{ color: TEXT_DIM, fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
                El análisis aparecerá aquí<br />
                <span style={{ fontSize: 11 }}>Pega un texto y presiona Analizar</span>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
              <Spinner size={28} color={CYAN} />
              <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Procesando con Gemini…</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>Cruzando con catálogo de servicios</div>
            </div>
          )}

          {resultado && (
            <div style={{ overflowY: 'auto', maxHeight: 580 }}>

              {/* Cliente + Proyecto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Cliente</div>
                  <InfoRow label="Nombre"   value={resultado.cliente?.nombre} />
                  <InfoRow label="Empresa"  value={resultado.cliente?.empresa} />
                  <InfoRow label="Email"    value={resultado.cliente?.email} />
                  <InfoRow label="Teléfono" value={resultado.cliente?.telefono} />
                </div>
                <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Proyecto</div>
                  <InfoRow label="Nombre"   value={resultado.proyecto?.nombre} />
                  <InfoRow label="Tipo"     value={resultado.proyecto?.tipo} />
                  <InfoRow label="Entrega"  value={resultado.proyecto?.fecha_entrega} />
                </div>
              </div>

              {/* Resumen de servicios */}
              <div style={{
                display: 'flex', gap: 10, marginBottom: 14,
                padding: '10px 14px', background: BG_BASE,
                border: `1px solid ${BORDER}`, borderRadius: 8,
              }}>
                <Stat label="Servicios" value={resultado.servicios?.length || 0} color={CYAN} />
                <div style={{ width: 1, background: BORDER }} />
                <Stat label="Con precio" value={totalConPrecio} color="#22C55E" />
                <div style={{ width: 1, background: BORDER }} />
                <Stat label="Sin match" value={totalSinPrecio} color={totalSinPrecio > 0 ? '#F97316' : TEXT_DIM} />
                <div style={{ width: 1, background: BORDER }} />
                <Stat label="Total estimado" value={formatMonto(totalEstimado, 'CLP')} color={GOLD} wide />
              </div>

              {/* Lista de servicios */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${GOLD}20` }}>
                  Servicios detectados ({resultado.servicios?.length || 0})
                </div>
                {resultado.servicios?.map((s, i) => (
                  <ServicioCard key={i} s={s} />
                ))}
              </div>

              {resultado.observaciones_generales && (
                <div style={{ padding: '10px 12px', background: `${CYAN}08`, border: `1px solid ${CYAN}20`, borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: CYAN, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Observaciones</div>
                  <p style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
                    {resultado.observaciones_generales}
                  </p>
                </div>
              )}

              <Button
                onClick={() => onPresupuestoGenerado(resultado)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                ⊕  Crear Presupuesto desde este Análisis
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ServicioCard ───────────────────────────────────────────────────────────
function ServicioCard({ s }) {
  const matched = s.match_exacto
  const hasSugerencia = !matched && s.sugerencia_categoria

  return (
    <div style={{
      background: BG_BASE, borderRadius: 8, marginBottom: 8,
      border: `1px solid ${matched ? '#22C55E30' : hasSugerencia ? '#F9731630' : BORDER}`,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, marginBottom: 4 }}>{s.nombre_servicio}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <CategoriaPill categoria={s.categoria} />
            <span style={{ fontSize: 11, color: TEXT_DIM }}>× {s.cantidad} {s.unidad}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {matched ? (
            <>
              <div style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>
                {formatMonto(s.precio_unitario, s.moneda)}
              </div>
              <div style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>✓ en catálogo</div>
            </>
          ) : hasSugerencia ? (
            <>
              <div style={{ fontSize: 12, color: '#F97316', fontWeight: 600 }}>Sin match directo</div>
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>ver sugerencia ↓</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: TEXT_DIM }}>Sin match</div>
          )}
        </div>
      </div>

      {/* Match del catálogo */}
      {matched && s.catalogo_nombre && (
        <div style={{ padding: '6px 12px 8px', borderTop: `1px solid ${BORDER}20`, background: '#22C55E08' }}>
          <span style={{ fontSize: 11, color: TEXT_DIM }}>Catálogo: </span>
          <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 500 }}>{s.catalogo_nombre}</span>
          <span style={{ fontSize: 11, color: TEXT_DIM }}> · {formatMonto(s.precio_unitario * (s.cantidad || 1), s.moneda)} subtotal</span>
        </div>
      )}

      {/* Sugerencia por categoría */}
      {hasSugerencia && (
        <div style={{ padding: '6px 12px 8px', borderTop: `1px solid ${BORDER}20`, background: '#F9731608' }}>
          <span style={{ fontSize: 11, color: TEXT_DIM }}>Sugerencia: </span>
          <span style={{ fontSize: 11, color: '#F97316', fontWeight: 500 }}>{s.sugerencia_categoria.nombre}</span>
          <span style={{ fontSize: 11, color: TEXT_DIM }}> · {formatMonto(s.sugerencia_categoria.precio, s.sugerencia_categoria.moneda)}</span>
        </div>
      )}

      {/* Fragmento del texto original */}
      {s.fragmento_texto && (
        <div style={{
          padding: '6px 12px 8px', borderTop: `1px solid ${BORDER}15`,
          background: '#ffffff04',
        }}>
          <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
            Origen en el texto
          </div>
          <div style={{
            fontSize: 12, color: TEXT_MUTED, fontStyle: 'italic',
            borderLeft: `2px solid ${GOLD}50`, paddingLeft: 8, lineHeight: 1.5,
          }}>
            "{s.fragmento_texto}"
          </div>
        </div>
      )}

      {/* Descripción / notas */}
      {(s.descripcion_detalle || s.notas_tecnicas) && (
        <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${BORDER}15` }}>
          {s.descripcion_detalle && (
            <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>{s.descripcion_detalle}</div>
          )}
          {s.notas_tecnicas && (
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 3 }}>↳ {s.notas_tecnicas}</div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color, wide }) {
  return (
    <div style={{ flex: wide ? 2 : 1, textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: TEXT_DIM, width: 60, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: TEXT }}>{value}</span>
    </div>
  )
}
