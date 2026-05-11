import { formatMonto } from '../theme'

function fmtMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `$ ${Math.round(n).toLocaleString('es-CL')}`
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function fmtFechaLarga(fechaIso) {
  const d = fechaIso ? new Date(fechaIso + 'T12:00:00') : new Date()
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtNumero(n) {
  if (!n) return ''
  const digits = String(n).replace(/\D/g, '')
  return digits.padStart(6, '0')
}

export function PDFPreview({ form, items, ajuste }) {
  const subtotal       = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const descuentoMonto = subtotal * (parseFloat(form.descuento || 0) / 100)
  const ivaPct         = parseFloat(form.iva || 19) / 100

  // Si hay ajuste: el valor ingresado es el nuevo Total Neto
  // IVA y TOTAL se recalculan con base en ese Total Neto
  const ajusteActivo = ajuste?.activo && ajuste?.total !== '' && ajuste?.total != null
  const baseImponible  = ajusteActivo ? (parseFloat(ajuste.total) || 0) : (subtotal - descuentoMonto)
  const ivaMonto       = baseImponible * ivaPct
  const totalFinal     = baseImponible + ivaMonto

  const validItems = items.filter(i => i.descripcion?.trim())

  return (
    <div style={{
      width:  '210mm',
      height: '297mm',
      margin: '0 auto',
      background: '#FFFFFF',
      color:  '#1F5773',
      fontFamily: 'DM Sans, Arial, sans-serif',
      backgroundImage: 'url(/template-presupuesto.png)',
      backgroundSize: '210mm 297mm',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      overflow: 'hidden',
      fontSize: '10pt',
    }}>
      {/* N° y fecha sobre el banner */}
      <div style={{
        position: 'absolute', right: '12mm', top: '13mm',
        color: '#FFFFFF', fontSize: '13pt', fontWeight: 700, letterSpacing: '0.5px',
        textAlign: 'right',
      }}>N° {fmtNumero(form.numero)}</div>

      <div style={{
        position: 'absolute', right: '12mm', top: '22mm',
        color: '#FFFFFF', fontSize: '9pt', opacity: 0.95,
        textAlign: 'right',
      }}>{fmtFechaLarga(form.fecha)}</div>

      {/* Bloque Cliente */}
      <div style={{
        position: 'absolute', left: '18mm', top: '42mm',
        fontSize: '10pt', lineHeight: 1.2,
      }}>
        <div>Para: <strong style={{ color: '#0E2A38' }}>{form.cliente || ''}</strong></div>
        <div>Cliente: <strong style={{ color: '#0E2A38' }}>{form.empresa || ''}</strong></div>
        <div>Mail: <strong style={{ color: '#0E2A38' }}>{form.email_cliente || ''}</strong></div>
        <div>De: <strong style={{ color: '#0E2A38' }}>Carolina Zepeda</strong></div>
        <div>Mail: <strong style={{ color: '#0E2A38' }}>carolina@onyria-studio.cl</strong></div>
      </div>

      {/* Proyecto */}
      <div style={{
        position: 'absolute', left: '18mm', right: '18mm', top: '68mm',
        fontSize: '10pt',
      }}>
        <div>Proyecto: <span style={{ fontWeight: 700, color: '#0E2A38' }}>{form.nombre_proyecto || ''}</span></div>
        <hr style={{ border: 'none', borderTop: '4px solid #0E4561', marginTop: '1mm' }} />
      </div>

      {/* Detalle */}
      <div style={{
        position: 'absolute', left: '18mm', right: '90mm', top: '80mm',
        fontSize: '10pt',
      }}>
        <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3mm', color: '#0E2A38' }}>Detalle:</div>
        <ul style={{ listStyle: 'disc', paddingLeft: '5mm', lineHeight: 1.7 }}>
          {validItems.map((i, idx) => {
            const cant = i.cantidad > 1 ? `${i.cantidad} ` : ''
            const subBullets = (i.notas || '').split(/[·•]/).map(s => s.trim()).filter(Boolean)
            return (
              <li key={idx} style={{ paddingLeft: '1mm' }}>
                {cant}{i.descripcion}
                {subBullets.length > 0 && (
                  <ul style={{ listStyle: 'circle', paddingLeft: '6mm', marginTop: '0.5mm', lineHeight: 1.5 }}>
                    {subBullets.map((n, j) => <li key={j}>{n}</li>)}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Observaciones (notas para el cliente) */}
      {form.notas && (
        <div style={{
          position: 'absolute', left: '22mm', right: '18mm', top: '187mm',
          fontSize: '9pt', lineHeight: 1.4, color: '#0E2A38',
        }}>
          <ul style={{ listStyle: 'disc', paddingLeft: '5mm', margin: 0 }}>
            {form.notas.split('\n').filter(l => l.trim()).map((l, i) => (
              <li key={i} style={{ paddingLeft: '1mm', marginBottom: '1mm' }}>{l.trim()}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Totales */}
      <div style={{
        position: 'absolute', right: '18mm', top: '145mm',
        fontSize: '10pt', lineHeight: 1.9,
        textAlign: 'right', fontWeight: 700, color: '#0E2A38',
      }}>
        <div>Total Neto: {fmtMonto(baseImponible, form.moneda)}</div>
        <div>IVA (19%): {fmtMonto(ivaMonto, form.moneda)}</div>
        <div style={{ fontSize: '12pt' }}>TOTAL: {fmtMonto(totalFinal, form.moneda)}</div>
      </div>

    </div>
  )
}
