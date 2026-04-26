import { GOLD, BG_SURFACE, BORDER, TEXT_MUTED, TEXT_DIM } from '../theme'

const NAV_ITEMS = [
  { id: 'dashboard',    icon: '◈', label: 'Dashboard'          },
  { id: 'nuevo',        icon: '⊕', label: 'Nuevo Presupuesto'  },
  { id: 'presupuestos', icon: '≡', label: 'Presupuestos'       },
  { id: 'clientes',     icon: '◉', label: 'Clientes'           },
  { id: 'servicios',    icon: '⊞', label: 'Servicios'          },
  { id: 'analisis',     icon: '◎', label: 'Análisis IA'        },
]

export function Sidebar({ active, onNav }) {
  return (
    <div style={{
      width: 220, background: BG_SURFACE, borderRight: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -40, left: -40, width: 180, height: 180,
        background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ padding: '20px 24px 18px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <img
            src="/logo.png"
            alt="Onyria Studio"
            style={{ height: 52, width: 'auto', borderRadius: 6, display: 'block' }}
          />
          <div style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Presupuestos
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                border: 'none', transition: 'all 0.18s',
                background: isActive ? `${GOLD}15` : 'transparent',
                color: isActive ? GOLD : TEXT_MUTED,
                fontFamily: 'inherit', fontSize: 14,
                fontWeight: isActive ? 600 : 400, position: 'relative',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#ffffff08' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: '0 2px 2px 0', background: GOLD,
                }} />
              )}
              <span style={{ fontSize: 18, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
