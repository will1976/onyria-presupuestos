import { formatMonto } from '../theme'

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
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      background: '#FFFFFF',
      color: '#1A1A2E',
      borderRadius: 6,
      overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 12,
      lineHeight: 1.6,
      backgroundImage: 'url(/template-presupuesto.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
    }}>
      <div style={{ padding: '60mm 18mm 50mm', position: 'relative' }}>

        {/* Número y fecha */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>N° {form.numero}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Fecha: {form.fecha}</div>
            <div style={{ fontSize: 11, color: '#555' }}>Válido por {form.validez} días</div>
          </div>
        </div>

        {/* Cliente + Proyecto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <InfoSection title="Cliente">
            <div style={{ fontWeight: 700 }}>{form.cliente || '—'}</div>
            {form.empresa      && <div>{form.empresa}</div>}
            {form.email_cliente && <div style={{ color: '#555' }}>{form.email_cliente}</div>}
            {form.telefono     && <div style={{ color: '#555' }}>{form.telefono}</div>}
          </InfoSection>
          <InfoSection title="Proyecto">
            <div style={{ fontWeight: 700 }}>{form.nombre_proyecto || '—'}</div>
            {form.tipo_proyecto && <div style={{ color: '#555' }}>{form.tipo_proyecto.replace(/_/g, ' ')}</div>}
          </InfoSection>
        </div>

        {/* Notas */}
        {form.notas && (
          <div style={{ background: '#F9F7F4', borderLeft: '3px solid #C9A84C', padding: '12px 16px', marginBottom: 20, borderRadius: 2 }}>
            <div style={{ fontSize: 12, color: '#444', whiteSpace: 'pre-line' }}>{form.notas}</div>
          </div>
        )}

        {/* Tabla de ítems */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#1A1A2E', color: '#FFF' }}>
              {['Descripción', 'Cant.', 'Precio Unitario', 'Subtotal'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#F9F7F4' : '#FFF' }}>
                <td style={{ padding: '8px 12px' }}>{item.descripcion || '—'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.cantidad}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(item.precioUnitario)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.cantidad * item.precioUnitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div style={{ width: 280 }}>
            <TotalLine label="Subtotal" value={fmt(subtotal)} />
            {parseFloat(form.descuento) > 0 && (
              <TotalLine label={`Descuento (${form.descuento}%)`} value={`- ${fmt(descuentoMonto)}`} color="#C00" />
            )}
            <TotalLine label={`IVA (${form.iva}%)`} value={fmt(ivaMonto)} />
            {ajuste?.activo && ajuste?.motivo && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: '#FAF6EC', borderLeft: '3px solid #C9A84C', fontSize: 10, color: '#666' }}>
                <strong>Ajuste:</strong> {ajuste.motivo}
              </div>
            )}
            <div style={{ borderTop: '2px solid #C9A84C', marginTop: 6, paddingTop: 10,
              display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
              <span style={{ color: '#C9A84C' }}>TOTAL</span>
              <span style={{ color: '#C9A84C' }}>{fmt(totalFinal)}</span>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        {form.condiciones && (
          <div style={{ borderTop: '1px solid #E5E0D8', paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 6 }}>
              Condiciones Comerciales
            </div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{form.condiciones}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoSection({ title, children }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C9A84C', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #F0E8D8' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: '#333', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  )
}

function TotalLine({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #EEE', fontSize: 12 }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ color: color || '#1A1A2E' }}>{value}</span>
    </div>
  )
}
