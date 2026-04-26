import { useEffect } from 'react'
import { BG_CARD, TEXT, GOLD, CYAN } from '../theme'

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const color = type === 'success' ? GOLD : type === 'error' ? '#EF4444' : CYAN
  const icon  = type === 'success' ? '✓'  : type === 'error' ? '✕'       : 'ℹ'

  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${color}60`,
      borderLeft: `3px solid ${color}`,
      padding: '14px 20px', borderRadius: 8, minWidth: 280,
      boxShadow: '0 8px 32px #00000080',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideUp 0.3s ease',
    }}>
      <span style={{ color, fontSize: 16, fontWeight: 700 }}>{icon}</span>
      <span style={{ color: TEXT, fontSize: 14, flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#7A7885', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
      >×</button>
    </div>
  )
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <Toast message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  )
}
