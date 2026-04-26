import { useEffect } from 'react'
import { BG_CARD, BORDER, TEXT, TEXT_MUTED } from '../theme'

export function Modal({ title, children, onClose, width = 520 }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#00000090',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: BG_CARD, border: `1px solid ${BORDER}`,
          borderRadius: 12, width, maxWidth: '95vw', maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px #00000090',
          animation: 'scaleIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <h3 style={{
            margin: 0, color: TEXT, fontSize: 16,
            letterSpacing: '0.03em',
          }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: TEXT_MUTED,
              cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
