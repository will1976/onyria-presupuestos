import { useState, useEffect } from 'react'
import { presupuestosService } from '../services/presupuestos.service'
import { Badge, CategoriaPill, Button, Spinner } from '../components/ui'
import { GOLD, GOLD_LIGHT, CYAN, BG_CARD, BORDER, TEXT, TEXT_MUTED, TEXT_DIM, ESTADOS, formatMonto } from '../components/theme'

export default function Dashboard({ onNav }) {
  const [metricas,      setMetricas]      = useState(null)
  const [presupuestos,  setPresupuestos]  = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      presupuestosService.metricas().catch(() => null),
      presupuestosService.listar({ limit: 5, order: 'desc' }).catch(() => ({ data: [] })),
    ]).then(([m, p]) => {
      setMetricas(m?.data || null)
      setPresupuestos(p?.data || [])
    }).finally(() => setLoading(false))
  }, [])

  const stats = metricas || {
    total_mes: 0, total_clp: 0, total_usd: 0,
    aceptados: 0, rechazados: 0, pendientes: 0,
    chart: [],
    por_estado: { borrador: 0, enviado: 0, aceptado: 0, rechazado: 0, expirado: 0 },
  }

  const rows = presupuestos

  const maxChart = Math.max(...(stats.chart?.map(d => d.total) || [1]))

  const metricCards = [
    { label: 'Presupuestos este mes', value: stats.total_mes,  sub: 'en enero 2025',                          color: GOLD   },
    { label: 'Cotizado CLP',          value: `$${(stats.total_clp / 1000000).toFixed(2)}M`, sub: 'pesos',     color: CYAN   },
    { label: 'Cotizado USD',          value: `$${Number(stats.total_usd).toLocaleString()}`, sub: 'dólares',   color: '#A855F7' },
    { label: 'Tasa Aceptación',
      value: `${Math.round((stats.aceptados / Math.max(stats.aceptados + stats.rechazados, 1)) * 100)}%`,
      sub: `${stats.pendientes} pendiente${stats.pendientes !== 1 ? 's' : ''}`,
      color: '#22C55E',
    },
  ]

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 600 }}>
          Dashboard
        </h1>
        <p style={{ margin: '6px 0 0', color: TEXT_MUTED, fontSize: 13 }}>
          Vista general del estudio
        </p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {metricCards.map((card, i) => (
          <div key={i} style={{
            background: BG_CARD, border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: '20px 22px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 80, height: 80,
              borderRadius: '50%', background: `${card.color}10`, pointerEvents: 'none',
            }} />
            <div style={{ fontSize: 9, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 26, color: card.color, fontWeight: 700, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28 }}>
        {/* Bar chart */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: TEXT, fontWeight: 600, letterSpacing: '0.04em' }}>EVOLUCIÓN MENSUAL — CLP</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Últimos 6 meses</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, paddingBottom: 4 }}>
            {stats.chart?.map((d, i) => {
              const h      = Math.max((d.total / maxChart) * 120, 4)
              const isLast = i === stats.chart.length - 1
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 9, color: isLast ? GOLD : TEXT_DIM }}>
                    ${(d.total / 1000000).toFixed(1)}M
                  </div>
                  <div style={{
                    width: '100%', height: h, borderRadius: '4px 4px 0 0',
                    background: isLast ? `linear-gradient(180deg, ${GOLD}, ${GOLD}80)` : `${GOLD}25`,
                    border: isLast ? `1px solid ${GOLD}60` : 'none',
                    transition: 'height 0.5s ease',
                  }} />
                  <div style={{ fontSize: 10, color: isLast ? GOLD : TEXT_DIM }}>{d.mes}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Estado breakdown */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, color: TEXT, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 20 }}>ESTADOS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(ESTADOS).map(([key, val]) => {
              const count = stats.por_estado?.[key] || 0
              const pct   = Math.round(count / Math.max(stats.total_mes, 1) * 100)
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: val.color }}>{val.label}</span>
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: BORDER, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: val.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent presupuestos */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 12, color: TEXT, fontWeight: 600, letterSpacing: '0.04em' }}>PRESUPUESTOS RECIENTES</div>
          <Button size="sm" variant="ghost" onClick={() => onNav('presupuestos')} style={{ color: GOLD, fontSize: 11 }}>
            Ver todos →
          </Button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['N° Presupuesto', 'Cliente', 'Proyecto', 'Monto', 'Estado', 'Fecha'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left', fontSize: 10,
                  color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontWeight: 600, borderBottom: `1px solid ${BORDER}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr
                key={p.id}
                style={{ borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}30` : 'none', transition: 'background 0.12s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1E1E24'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => onNav('presupuestos')}
              >
                <td style={{ padding: '12px 16px', fontSize: 12, color: GOLD, fontWeight: 600 }}>{p.numero}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: TEXT }}>{p.cliente || p.cliente_nombre}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_MUTED }}>{p.nombre_proyecto}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: TEXT, fontWeight: 600,  }}>
                  {formatMonto(p.total, p.moneda)}
                </td>
                <td style={{ padding: '12px 16px' }}><Badge estado={p.estado} /></td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_MUTED }}>
                  {p.created_at?.split('T')[0] || p.created_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
