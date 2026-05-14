/**
 * Adapter: convierte una fila de la tabla `presupuestos` (con sus items)
 * al contexto que espera el template quotation.hbs.
 *
 * Mantiene compatibilidad con la firma original: el controlador sigue
 * llamando `generarPDF(presupuesto)` con el row de la BD; este módulo
 * hace toda la traducción.
 *
 * Reglas de negocio importantes:
 *   - Si hay ajuste_total: el ajuste ES el nuevo Total Neto, el IVA se recalcula
 *     y TOTAL = ajuste_total * 1.19.
 *   - Si no hay ajuste: usar subtotal/impuesto/total del row tal cual.
 */

const MESES_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

// ── Formateo de números/fechas ───────────────────────────────────────────
function fmtMonto(n, moneda) {
  const v = parseFloat(n) || 0
  if (moneda === 'USD') {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return Math.round(v).toLocaleString('es-CL')
}

function fmtFechaLarga(iso) {
  const d = iso ? new Date(typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso) : new Date()
  return `${DIAS_ES[d.getDay()]}, ${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

/**
 * Extrae el ÚLTIMO segmento numérico del número de presupuesto y lo padea a 6 dígitos.
 * Ej: 'ONY-2026-4451' → '004451'
 *     'ONY-2026-610'  → '000610'
 *     'ONY-2026-1'    → '000001'
 */
function fmtNumero(n) {
  if (!n) return ''
  const groups = String(n).match(/\d+/g)
  if (!groups || !groups.length) return ''
  const last = groups[groups.length - 1]
  return last.padStart(6, '0')
}

// ── Helpers para items y listas dinámicas ───────────────────────────────
/** Convierte el campo `notas` del item en sub-bullets (split por · o •) */
function notasToSubBullets(notas) {
  if (!notas) return []
  return String(notas).split(/[·•\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Las observaciones son `presupuesto.notas` con un bullet por línea */
function notasToBullets(notas) {
  if (!notas) return []
  return String(notas).split(/\n+/).map(s => s.trim()).filter(Boolean)
}

/** Las condiciones idem: una por línea */
function condicionesToBullets(condiciones) {
  if (!condiciones) return []
  return String(condiciones).split(/\n+/).map(s => s.trim()).filter(Boolean)
}

// ── Adapter principal ────────────────────────────────────────────────────
function presupuestoAdapter(p) {
  if (!p) return {}

  const moneda = p.moneda || 'CLP'

  // Si hay ajuste, recalcular base imponible / iva / total
  let baseImponible, iva, total
  if (p.ajuste_total != null) {
    baseImponible = parseFloat(p.ajuste_total)
    iva           = baseImponible * 0.19
    total         = baseImponible + iva
  } else {
    const subtotal  = parseFloat(p.subtotal)  || 0
    const descPct   = parseFloat(p.descuento) || 0
    const descMonto = subtotal * (descPct / 100)
    baseImponible = subtotal - descMonto
    iva           = parseFloat(p.impuesto) || 0
    total         = parseFloat(p.total)    || 0
  }

  const items = (p.items || [])
    .filter(i => (i.descripcion_personalizada || i.descripcion))
    .map(i => {
      const cant = parseFloat(i.cantidad) || 1
      return {
        descripcion: i.descripcion_personalizada || i.descripcion,
        cantidad:    cant > 1 ? cant : null,
        subBullets:  notasToSubBullets(i.notas),
      }
    })

  return {
    numeroCotizacion: fmtNumero(p.numero),
    fechaCotizacion:  fmtFechaLarga(p.fecha_emision),
    validez:          p.validez_dias || 30,

    cliente:         p.cliente_empresa || p.cliente_nombre || '',
    contactoCliente: p.cliente_nombre || '',
    mailCliente:     p.cliente_email  || '',

    // Por ahora hardcoded en el adapter (puede venir del usuario/configuración futura)
    ejecutivo:     p.ejecutivo     || 'Carolina Zepeda',
    mailEjecutivo: p.mailEjecutivo || 'carolina@onyria-studio.cl',

    proyecto: p.nombre_proyecto || '',

    items,

    moneda,
    neto:  fmtMonto(baseImponible, moneda),
    iva:   fmtMonto(iva, moneda),
    total: fmtMonto(total, moneda),

    observaciones: notasToBullets(p.notas),
    condiciones:   condicionesToBullets(p.condiciones),
    formaPago:     p.forma_pago || '30 a 60 días',

    // Bloque de datos de empresa (se renderiza al pie del contenido, antes del footer.png)
    empresa: {
      nombre:    p.empresa_nombre    || 'Onyria Studio SpA',
      rut:       p.empresa_rut       || '77.946.076-2',
      direccion: p.empresa_direccion || 'Santa Magdalena 75 of 304, Providencia',
      banco:     p.empresa_banco     || 'Banco Santander - Cta corriente No 0-000-9632329-8',
      correo:    p.empresa_correo    || 'carolina@onyria-studio.cl',
    },
  }
}

module.exports = { presupuestoAdapter, fmtMonto, fmtFechaLarga, fmtNumero }
