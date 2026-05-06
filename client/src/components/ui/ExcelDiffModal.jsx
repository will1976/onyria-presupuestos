import { useState } from 'react'
import { GOLD, CYAN, BG_CARD, BG_SURFACE, BG_HOVER, BORDER, TEXT, TEXT_MUTED, TEXT_DIM } from '../theme'

function fmt(n) {
  return `$${Math.round(parseFloat(n) || 0).toLocaleString('es-CL')}`
}

export function ExcelDiffModal({ diffs, onConfirm, onCancel, loading }) {
  // Estado inicial: todos usan precio del template
  const [choices, setChoices] = useState(
    Object.fromEntries(diffs.map(d => [d.normName, 'template']))
  )

  function setAll(val) {
    setChoices(Object.fromEntries(diffs.map(d => [d.normName, val])))
  }

  function toggle(normName) {
    setChoices(prev => ({ ...prev, [normName]: prev[normName] === 'app' ? 'template' : 'app' }))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
        width: '100%', maxWidth: 680, boxShadow: '0 20px 60px #00000090',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>Diferencias de precio detectadas</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>
              {diffs.length} ítem{diffs.length !== 1 ? 's' : ''} con precio distinto entre la aplicación y el template Excel
            </div>
          </div>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: TEXT_MUTED,
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Botones globales */}
        <div style={{
          padding: '10px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: TEXT_DIM, fontSize: 12, marginRight: 4 }}>Aplicar a todos:</span>
          <button onClick={() => setAll('template')} style={{
            background: `${CYAN}15`, border: `1px solid ${CYAN}50`,
            borderRadius: 6, padding: '5px 14px', color: CYAN,
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
          }}>Usar todos del Excel</button>
          <button onClick={() => setAll('app')} style={{
            background: `${GOLD}15`, border: `1px solid ${GOLD}50`,
            borderRadius: 6, padding: '5px 14px', color: GOLD,
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
          }}>Usar todos de la App</button>
        </div>

        {/* Tabla de diffs */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ítem', 'Precio Excel', 'Precio App', 'Usar'].map(h => (
                  <th key={h} style={{
                    padding: '9px 16px', textAlign: 'left', fontSize: 10,
                    color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.07em',
                    fontWeight: 600, borderBottom: `1px solid ${BORDER}`,
                    position: 'sticky', top: 0, background: BG_SURFACE,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diffs.map((d, i) => {
                const using = choices[d.normName] || 'template'
                return (
                  <tr key={d.normName} style={{
                    borderBottom: i < diffs.length - 1 ? `1px solid ${BORDER}20` : 'none',
                    background: 'transparent', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = BG_HOVER}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', fontSize: 13, color: TEXT }}>{d.nombre}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: CYAN, fontWeight: 600 }}>
                      {fmt(d.precioTemplate)}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: GOLD, fontWeight: 600 }}>
                      {fmt(d.precioApp)}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {/* Toggle: Excel / App */}
                      <div
                        onClick={() => toggle(d.normName)}
                        style={{
                          display: 'inline-flex', alignItems: 'center',
                          background: BG_SURFACE, border: `1px solid ${BORDER}`,
                          borderRadius: 20, padding: '3px 4px', cursor: 'pointer',
                          gap: 2, userSelect: 'none',
                        }}
                      >
                        <span style={{
                          padding: '3px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                          background: using === 'template' ? `${CYAN}20` : 'transparent',
                          color: using === 'template' ? CYAN : TEXT_DIM,
                          transition: 'all 0.15s',
                        }}>Excel</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                          background: using === 'app' ? `${GOLD}20` : 'transparent',
                          color: using === 'app' ? GOLD : TEXT_DIM,
                          transition: 'all 0.15s',
                        }}>App</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onCancel} style={{
            background: 'transparent', border: `1px solid ${BORDER}`,
            borderRadius: 7, padding: '9px 20px', color: TEXT_MUTED,
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>Cancelar</button>
          <button
            onClick={() => onConfirm(choices)}
            disabled={loading}
            style={{
              background: `linear-gradient(135deg, ${GOLD}, #F5C842)`,
              border: 'none', borderRadius: 7, padding: '9px 24px',
              color: '#0A0A0B', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1,
            }}
          >{loading ? 'Generando...' : '↓ Generar Excel'}</button>
        </div>
      </div>
    </div>
  )
}
