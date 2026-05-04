import { useState } from 'react'
import { GOLD, GOLD_LIGHT, CYAN, BG_BASE, BG_SURFACE, BORDER, TEXT, TEXT_MUTED, TEXT_DIM, ESTADOS, CATEGORIAS, getCat } from '../theme'

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, color = GOLD }) {
  return (
    <div style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${BORDER}`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Button ─────────────────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary:   { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, color: '#0A0A0B', border: 'none' },
  secondary: { background: 'transparent', color: TEXT, border: `1px solid ${BORDER}` },
  ghost:     { background: 'transparent', color: TEXT_MUTED, border: 'none' },
  danger:    { background: 'transparent', color: '#EF4444', border: '1px solid #EF444430' },
  cyan:      { background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}40` },
}
const BTN_SIZES = {
  sm: { padding: '6px 14px', fontSize: 13 },
  md: { padding: '10px 20px', fontSize: 15 },
  lg: { padding: '13px 28px', fontSize: 16 },
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, style: sx, loading, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        borderRadius: 6, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontWeight: 600, letterSpacing: '0.03em',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'all 0.18s', opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        ...BTN_VARIANTS[variant], ...BTN_SIZES[size], ...sx,
      }}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', placeholder, readOnly, style: sx, error, onFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={e => { setFocused(true); onFocus?.(e) }}
        onBlur={() => setFocused(false)}
        style={{
          background: readOnly ? BG_SURFACE : BG_BASE,
          border: `1px solid ${error ? '#EF4444' : focused ? GOLD + '80' : BORDER}`,
          borderRadius: 6, padding: '10px 12px',
          color: readOnly ? TEXT_MUTED : TEXT,
          fontSize: 15, outline: 'none', width: '100%',
          boxSizing: 'border-box', transition: 'border-color 0.2s',
          fontFamily: 'inherit',
          ...sx,
        }}
      />
      {error && <span style={{ fontSize: 13, color: '#EF4444' }}>{error}</span>}
    </div>
  )
}

// ── Textarea ───────────────────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows = 4, style: sx }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          background: BG_BASE, border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: '10px 12px', color: TEXT,
          fontSize: 15, outline: 'none', resize: 'vertical',
          fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box',
          width: '100%',
          ...sx,
        }}
        onFocus={e => { e.target.style.borderColor = GOLD + '80' }}
        onBlur={e => { e.target.style.borderColor = BORDER }}
      />
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, style: sx }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: BG_BASE, border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: '10px 12px', color: TEXT,
          fontSize: 15, outline: 'none', cursor: 'pointer',
          fontFamily: 'inherit', width: '100%',
          ...sx,
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Badge (estado) ─────────────────────────────────────────────────────────
export function Badge({ estado }) {
  const s = ESTADOS[estado] || ESTADOS.borrador
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}40`,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ── CategoriaPill ──────────────────────────────────────────────────────────
export function CategoriaPill({ categoria }) {
  const cat = getCat(categoria)
  return (
    <span style={{
      background: cat.color + '18', color: cat.color,
      border: `1px solid ${cat.color}35`,
      padding: '3px 10px', borderRadius: 4,
      fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>{cat.label}</span>
  )
}

// ── ActionBtn ──────────────────────────────────────────────────────────────
export function ActionBtn({ title, color, onClick, children }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? color + '20' : 'transparent',
        border: `1px solid ${hover ? color + '60' : BORDER}`,
        color: hover ? color : TEXT_MUTED,
        borderRadius: 5, padding: '4px 8px',
        cursor: 'pointer', fontSize: 14,
        fontFamily: 'inherit', transition: 'all 0.15s',
      }}
    >{children}</button>
  )
}

// ── Divider ────────────────────────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      {label && <span style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  )
}
