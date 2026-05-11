// ── Design Tokens ─────────────────────────────────────────────────────────
export const GOLD        = '#C9A84C'
export const GOLD_LIGHT  = '#E8C97A'
export const CYAN        = '#00D4FF'
export const BG_BASE     = '#0A0A0B'
export const BG_SURFACE  = '#111114'
export const BG_CARD     = '#16161A'
export const BG_HOVER    = '#1E1E24'
export const BORDER      = '#35353F'
export const TEXT        = '#F0EDE8'
export const TEXT_MUTED  = '#A8A4B8'
export const TEXT_DIM    = '#6E6A82'

// ── Domain Constants ──────────────────────────────────────────────────────
export const CATEGORIAS = [
  { id: 'Estudio',                label: 'Estudio',                color: '#C9A84C' },
  { id: 'Locutor',                label: 'Locutor',                color: '#00D4FF' },
  { id: 'musica_original',        label: 'Música Original',        color: '#A855F7' },
  { id: 'musica_archivo',         label: 'Música Archivo',         color: '#22C55E' },
  { id: 'renovacion_derecho',     label: 'Renovación Derechos',    color: '#F59E0B' },
  { id: 'Personajes - Doblajes',  label: 'Personajes / Doblajes',  color: '#F97316' },
  { id: 'podcast',                label: 'Podcast',                color: '#EC4899' },
  { id: 'otro',                   label: 'Otro',                   color: '#94A3B8' },
]

export const ESTADOS = {
  borrador:  { label: 'Borrador',  color: '#7A7885', bg: '#1E1E24' },
  enviado:   { label: 'Enviado',   color: '#00D4FF', bg: '#001A22' },
  aceptado:  { label: 'Aceptado', color: '#22C55E', bg: '#0A1F0E' },
  rechazado: { label: 'Rechazado', color: '#EF4444', bg: '#1F0A0A' },
  expirado:  { label: 'Expirado',  color: '#F97316', bg: '#1F110A' },
}

export const MONEDAS = [
  { value: 'CLP', label: 'CLP — Pesos Chilenos' },
  { value: 'USD', label: 'USD — Dólares'         },
]

export const UNIDADES = [
  'por pieza', 'por minuto', 'por hora', 'por episodio',
  'por idioma', 'por proyecto', 'por hito', 'por día',
]

// ── Helpers ───────────────────────────────────────────────────────────────
export function formatMonto(monto, moneda) {
  if (moneda === 'CLP') return `$${Math.round(monto).toLocaleString('es-CL')} CLP`
  return `USD ${Number(monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function getCat(id) {
  return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1]
}
