import { formatMonto } from '../theme'

// Coordenadas en mm, calzadas sobre Template PDF Presupuesto.png (A4 210x297mm)
// Los labels del template (Para, Cliente, Mail, De, Proyecto, Detalle, Total Neto,
// IVA, TOTAL, Observaciones, Forma de Pago) ya están impresos en la imagen.

const COL_VALUE_X = 33    // Columna donde empiezan los valores del bloque "Para"
const ROW_CLIENTE = 39    // y posición de cada fila (spacing ~4mm)
const ROW_MAIL_C  = 43
const ROW_DE      = 47
const ROW_MAIL_D  = 51

const ROW_PROYECTO      = 60
const ROW_PROYECTO_TIPO = 65
const ROW_DETALLE       = 73

const ROW_TOT_NETO  = 144
const ROW_TOT_IVA   = 151
const ROW_TOT_FINAL = 158

// Formato sin "$" porque el template ya trae "$"
function fmtNum(n, moneda) {
  const num = parseFloat(n) || 0
  if (moneda === 'CLP') return `${Math.round(num).toLocaleString('es-CL')} CLP`
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
}

export function PDFPreview({ form, items, ajuste }) {
  const subtotal       = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const descuentoMonto = subtotal * (parseFloat(form.descuento || 0) / 100)
  const baseImponible  = subtotal - descuentoMonto
  const ivaMonto       = baseImponible * (parseFloat(form.iva || 19) / 100)
  const totalCalculado = baseImponible + ivaMonto
  const totalFinal     = ajuste?.activo && ajuste?.total !== '' && ajuste?.total != null
    ? parseFloat(ajuste.total) || 0
    : totalCalculado
  const fmt            = (n) => formatMonto(n, form.moneda)

  return (
    <div style={{
      width:  '210mm',
      height: '297mm',
      margin: '0 auto',
      background: '#FFFFFF',
      color:  '#0D0E1C',
      fontFamily: 'DM Sans, Arial, sans-serif',
      backgroundImage: 'url(/template-presupuesto.png)',
      backgroundSize: '210mm 297mm',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      overflow: 'hidden',
      fontSize: '9pt',
    }}>
      {/* ─── Bloque Para ─── */}
      <Field x={COL_VALUE_X} y={ROW_CLIENTE} value={form.cliente} bold />
      <Field x={COL_VALUE_X} y={ROW_MAIL_C}  value={form.email_cliente} />
      <Field x={COL_VALUE_X} y={ROW_DE}      value="Onyria Studio" bold />
      <Field x={COL_VALUE_X} y={ROW_MAIL_D}  value="contacto@onyria-studio.cl" />

      {/* ─── Número y fecha (top-right) ─── */}
      <div style={absStyle(135, ROW_CLIENTE, 60)}>
        <div style={{ fontSize: '8pt', color: '#666' }}>N° Cotización</div>
        <div style={{ fontWeight: 700, fontSize: '11pt' }}>{form.numero}</div>
        <div style={{ fontSize: '8pt', color: '#666', marginTop: 2 }}>Fecha: {form.fecha}</div>
        <div style={{ fontSize: '8pt', color: '#888' }}>Validez: {form.validez} días</div>
      </div>

      {/* ─── Proyecto ─── */}
      <Field x={COL_VALUE_X} y={ROW_PROYECTO}      value={form.nombre_proyecto} bold size="10pt" width={160} />
      {form.tipo_proyecto && (
        <Field x={COL_VALUE_X} y={ROW_PROYECTO_TIPO} value={form.tipo_proyecto.replace(/_/g, ' ')} size="8pt" color="#555" width={160} />
      )}

      {/* ─── Detalle (items) ─── */}
      <div style={{ ...absStyle(18, ROW_DETALLE, 174), maxHeight: 65, overflow: 'hidden' }}>
        {items.filter(i => i.descripcion?.trim()).map((i, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: '9pt',
            lineHeight: 1.4,
            paddingBottom: 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span>• {i.descripcion}</span>
              {i.cantidad > 1 && <span style={{ color: '#888' }}> × {i.cantidad}</span>}
            </div>
            <div style={{ color: '#444', whiteSpace: 'nowrap' }}>{fmt(i.cantidad * i.precioUnitario)}</div>
          </div>
        ))}
      </div>

      {/* ─── Totales (alineados al "$" del template, lado derecho) ─── */}
      <div style={{ ...absStyle(155, ROW_TOT_NETO, 40), textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>
        {fmtNum(baseImponible, form.moneda)}
      </div>
      <div style={{ ...absStyle(155, ROW_TOT_IVA, 40), textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>
        {fmtNum(ivaMonto, form.moneda)}
      </div>
      <div style={{ ...absStyle(155, ROW_TOT_FINAL, 40), textAlign: 'right', fontSize: '10pt', fontWeight: 700 }}>
        {fmtNum(totalFinal, form.moneda)}
      </div>

      {/* ─── Motivo de ajuste (si aplica) ─── */}
      {ajuste?.activo && ajuste?.motivo && (
        <div style={{ ...absStyle(18, 167, 130), fontSize: '7.5pt', color: '#666', fontStyle: 'italic' }}>
          Ajuste de total: {ajuste.motivo}
        </div>
      )}
    </div>
  )
}

function absStyle(xMm, yMm, wMm) {
  return {
    position: 'absolute',
    left: `${xMm}mm`,
    top:  `${yMm}mm`,
    width: wMm ? `${wMm}mm` : undefined,
  }
}

function Field({ x, y, value, bold, size = '9pt', color = '#0D0E1C', width = 100 }) {
  if (!value) return null
  return (
    <div style={{
      ...absStyle(x, y, width),
      fontSize: size,
      fontWeight: bold ? 700 : 400,
      color,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {value}
    </div>
  )
}
