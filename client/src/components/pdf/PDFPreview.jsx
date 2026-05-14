/**
 * Preview HTML que espejea el PDF generado por server/src/pdf/pdf-generator.js.
 *
 * Estructura paralela al PDF:
 *   - header.png (con N° y fecha como overlay HTML — en el PDF van bakeados en
 *     la imagen via Sharp; aquí los renderizamos como divs absolutos sobre el banner)
 *   - Contenido central en flow layout (mismos tamaños/colores que el .hbs)
 *   - footer.png al pie
 */
import { formatMonto } from '../theme'

function fmtMonto(monto, moneda) {
  const n = parseFloat(monto) || 0
  if (moneda === 'CLP') return `${Math.round(n).toLocaleString('es-CL')}`
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function fmtFechaLarga(fechaIso) {
  const d = fechaIso ? new Date(fechaIso + 'T12:00:00') : new Date()
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

function fmtNumero(n) {
  if (!n) return ''
  const groups = String(n).match(/\d+/g)
  if (!groups || !groups.length) return ''
  return groups[groups.length - 1].padStart(6, '0')
}

const EMPRESA = {
  nombre:    'Onyria Studio SpA',
  rut:       '77.946.076-2',
  direccion: 'Santa Magdalena 75 of 304, Providencia',
  banco:     'Banco Santander - Cta corriente No 0-000-9632329-8',
  correo:    'carolina@onyria-studio.cl',
}

export function PDFPreview({ form, items, ajuste }) {
  const subtotal       = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const descuentoMonto = subtotal * (parseFloat(form.descuento || 0) / 100)
  const ivaPct         = parseFloat(form.iva || 19) / 100

  // Si hay ajuste: el valor ingresado es el nuevo Total Neto, IVA y TOTAL se recalculan
  const ajusteActivo  = ajuste?.activo && ajuste?.total !== '' && ajuste?.total != null
  const baseImponible = ajusteActivo ? (parseFloat(ajuste.total) || 0) : (subtotal - descuentoMonto)
  const ivaMonto      = baseImponible * ivaPct
  const totalFinal    = baseImponible + ivaMonto

  const validItems   = items.filter(i => i.descripcion?.trim())
  const observaciones = (form.notas       || '').split('\n').map(s => s.trim()).filter(Boolean)
  const condiciones   = (form.condiciones || '').split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      background: '#FFFFFF',
      color: '#1F5773',
      fontFamily: 'DM Sans, Arial, sans-serif',
      fontSize: '10pt',
      position: 'relative',
    }}>
      {/* ── HEADER (banner + N° y fecha overlay) ──────────────────────── */}
      <div style={{ position: 'relative', width: '100%' }}>
        <img src="/header.png" alt="" style={{ display: 'block', width: '100%', margin: 0, padding: 0 }} />
        <div style={{
          position: 'absolute',
          right: '12mm',
          top: '52%',
          transform: 'translateY(-100%)',
          color: '#FFFFFF',
          textAlign: 'right',
          lineHeight: 1.05,
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}>
          <div style={{ fontSize: '10pt', fontWeight: 700 }}>N° {fmtNumero(form.numero)}</div>
          <div style={{ fontSize: '8pt', fontWeight: 400, marginTop: '0.5mm' }}>{fmtFechaLarga(form.fecha)}</div>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ───────────────────────────────────────── */}
      <div style={{ padding: '6mm 18mm 4mm' }}>

        {/* Bloque cliente */}
        <div style={{ fontSize: '10pt', lineHeight: 1.2, marginBottom: '5mm' }}>
          <div>Para: <strong style={{ color: '#0E2A38' }}>{form.cliente || ''}</strong></div>
          <div>Cliente: <strong style={{ color: '#0E2A38' }}>{form.empresa || ''}</strong></div>
          <div>Mail: <strong style={{ color: '#0E2A38' }}>{form.email_cliente || ''}</strong></div>
          <div>De: <strong style={{ color: '#0E2A38' }}>Carolina Zepeda</strong></div>
          <div>Mail: <strong style={{ color: '#0E2A38' }}>carolina@onyria-studio.cl</strong></div>
        </div>

        {/* Proyecto */}
        <div style={{ marginBottom: '6mm' }}>
          <div style={{ fontSize: '10pt' }}>
            Proyecto: <span style={{ fontWeight: 700, color: '#0E2A38' }}>{form.nombre_proyecto || ''}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '4px solid #0E4561', marginTop: '1mm' }} />
        </div>

        {/* Detalle */}
        <div style={{ marginBottom: '4mm' }}>
          <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3mm', color: '#0E2A38' }}>Detalle:</div>
          <ul style={{ listStyle: 'disc', paddingLeft: '5mm', lineHeight: 1.4, fontSize: '8pt', margin: 0 }}>
            {validItems.map((i, idx) => {
              const cant = i.cantidad > 1 ? `${i.cantidad} ` : ''
              const subBullets = (i.notas || '').split(/[·•]/).map(s => s.trim()).filter(Boolean)
              return (
                <li key={idx} style={{ paddingLeft: '1mm' }}>
                  {cant}{i.descripcion}
                  {subBullets.length > 0 && (
                    <ul style={{ listStyle: 'circle', paddingLeft: '6mm', margin: '0.4mm 0 0.8mm', lineHeight: 1.3, fontSize: '7.5pt' }}>
                      {subBullets.map((n, j) => <li key={j}>{n}</li>)}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Totales (mismo tamaño todos) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '33mm', marginBottom: '6mm' }}>
          <div style={{ minWidth: '70mm', textAlign: 'right', fontWeight: 700, color: '#0E2A38', fontSize: '10pt', lineHeight: 1.9 }}>
            <div>Total Neto: $ {fmtMonto(baseImponible, form.moneda)}</div>
            <div>IVA (19%): $ {fmtMonto(ivaMonto, form.moneda)}</div>
            <div>TOTAL: $ {fmtMonto(totalFinal, form.moneda)}</div>
          </div>
        </div>

        {/* Observaciones (bar azul oscuro + white) */}
        {observaciones.length > 0 && (
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ background: '#0E4561', color: '#FFFFFF', padding: '1.3mm 4mm', fontWeight: 700, fontSize: '7.5pt', letterSpacing: '0.3px', marginBottom: '1.8mm' }}>Observaciones</div>
            <ul style={{ listStyle: 'disc', paddingLeft: '5mm', fontSize: '7.5pt', lineHeight: 1.35, color: '#0E2A38', margin: 0 }}>
              {observaciones.map((l, i) => <li key={i} style={{ marginBottom: '0.5mm', paddingLeft: '1mm' }}>{l}</li>)}
            </ul>
          </div>
        )}

        {/* Forma de Pago (bar beige) */}
        {form.forma_pago !== undefined || true ? (
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ background: '#E8E5DC', color: '#0E2A38', padding: '1.3mm 4mm', fontWeight: 700, fontSize: '7.5pt', letterSpacing: '0.3px' }}>
              Forma de Pago: {form.forma_pago || '30 a 60 días'}
            </div>
          </div>
        ) : null}

        {/* Condiciones (sin bar, solo bullets más pequeños) */}
        {condiciones.length > 0 && (
          <div style={{ marginBottom: '6mm' }}>
            <ul style={{ listStyle: 'disc', paddingLeft: '5mm', fontSize: '6.5pt', lineHeight: 1.2, color: '#0E2A38', margin: 0 }}>
              {condiciones.map((l, i) => <li key={i} style={{ marginBottom: '0.3mm', paddingLeft: '1mm' }}>{l}</li>)}
            </ul>
          </div>
        )}

        {/* Empresa */}
        <div style={{ marginTop: '5mm', textAlign: 'center', color: '#0E2A38' }}>
          <div style={{ height: '3mm', background: '#0E4561' }} />
          <div style={{ padding: '2mm 0', fontSize: '8pt', lineHeight: 1.35 }}>
            <div style={{ fontWeight: 700, fontSize: '8.5pt' }}>{EMPRESA.nombre}</div>
            <div>Rut: {EMPRESA.rut}</div>
            <div>Dirección: {EMPRESA.direccion}</div>
          </div>
          <div style={{ height: '3mm', background: '#0E4561' }} />
          <div style={{ padding: '2mm 0', fontSize: '8pt', lineHeight: 1.35 }}>
            <div>{EMPRESA.banco}</div>
            <div>Correo: {EMPRESA.correo}</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <div style={{ width: '100%' }}>
        <img src="/footer.png" alt="" style={{ display: 'block', width: '100%', margin: 0, padding: 0 }} />
      </div>
    </div>
  )
}
