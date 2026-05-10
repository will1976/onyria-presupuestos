import { formatMonto } from '../theme'

// Coordenadas en mm, calzadas sobre Template PDF Presupuesto.png (A4 210x297mm)
// El template ya tiene impresos los labels: Para, Cliente, Mail, De, Proyecto,
// Detalle, Total Neto, IVA (19%), TOTAL, Observaciones, Forma de Pago, footer.
// Solo se rellenan los valores junto a cada label.

const COL_LABEL_X = 33   // Columna donde empiezan los valores del bloque "Para"
const ROW_CLIENTE = 41
const ROW_MAIL_C  = 47
const ROW_DE      = 53
const ROW_MAIL_D  = 59

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
      fontSize: '10pt',
    }}>
      {/* ─── Bloque Para (top-left, junto a labels del template) ─── */}
      <Field x={COL_LABEL_X} y={ROW_CLIENTE} value={form.cliente} bold />
      <Field x={COL_LABEL_X} y={ROW_MAIL_C}  value={form.email_cliente} />
      <Field x={COL_LABEL_X} y={ROW_DE}      value="Onyria Studio" bold />
      <Field x={COL_LABEL_X} y={ROW_MAIL_D}  value="contacto@onyria-studio.cl" />

      {/* ─── Número y fecha (top-right) ─── */}
      <div style={absStyle(135, 41, 60)}>
        <div style={{ fontSize: '9pt', color: '#666' }}>N° Cotización</div>
        <div style={{ fontWeight: 700, fontSize: '11pt' }}>{form.numero}</div>
        <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>Fecha: {form.fecha}</div>
        <div style={{ fontSize: '8pt', color: '#888' }}>Validez: {form.validez} días</div>
      </div>

      {/* ─── Proyecto ─── */}
      <Field x={COL_LABEL_X} y={75} value={form.nombre_proyecto} bold size="10.5pt" />
      {form.tipo_proyecto && (
        <Field x={COL_LABEL_X} y={80} value={form.tipo_proyecto.replace(/_/g, ' ')} size="9pt" color="#555" />
      )}

      {/* ─── Detalle (items) ─── */}
      <div style={{ ...absStyle(18, 92, 174), maxHeight: 60, overflow: 'hidden' }}>
        {items.map((i, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: '9pt',
            lineHeight: 1.5,
            paddingBottom: 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: '#0D0E1C' }}>• {i.descripcion || '—'}</span>
              {i.cantidad > 1 && <span style={{ color: '#888' }}> × {i.cantidad}</span>}
            </div>
            <div style={{ color: '#444', whiteSpace: 'nowrap' }}>{fmt(i.cantidad * i.precioUnitario)}</div>
          </div>
        ))}
      </div>

      {/* ─── Totales (alineados al "$" del template) ─── */}
      <div style={{ ...absStyle(140, 162, 55), textAlign: 'right' }}>
        <div style={{ fontSize: '10pt', lineHeight: 1.85, fontWeight: 600, color: '#0D0E1C' }}>
          {fmt(subtotal - descuentoMonto)}
        </div>
        <div style={{ fontSize: '10pt', lineHeight: 1.85, fontWeight: 600, color: '#0D0E1C' }}>
          {fmt(ivaMonto)}
        </div>
        <div style={{ fontSize: '11pt', lineHeight: 1.85, fontWeight: 700, color: '#0D0E1C' }}>
          {fmt(totalFinal)}
        </div>
      </div>

      {/* ─── Motivo de ajuste (si aplica) ─── */}
      {ajuste?.activo && ajuste?.motivo && (
        <div style={{ ...absStyle(18, 187, 174), fontSize: '8pt', color: '#666', fontStyle: 'italic' }}>
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

function Field({ x, y, value, bold, size = '10pt', color = '#0D0E1C', width = 100 }) {
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
