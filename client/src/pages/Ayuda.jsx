import { useState } from 'react'
import {
  GOLD, BG_SURFACE, BG_CARD, BG_HOVER, BORDER,
  TEXT, TEXT_MUTED, TEXT_DIM,
} from '../components/theme'

const SECCIONES = [
  { id: 'acerca',       icon: '◈', label: 'Acerca de la app'         },
  { id: 'presupuesto',  icon: '⊕', label: 'Crear un presupuesto'     },
  { id: 'ia',           icon: '◎', label: 'Análisis con IA'          },
  { id: 'clientes',     icon: '◉', label: 'Gestión de clientes'      },
  { id: 'servicios',    icon: '⊞', label: 'Catálogo de servicios'    },
  { id: 'estados',      icon: '≡', label: 'Estados de presupuesto'   },
  { id: 'glosario',     icon: '◧', label: 'Glosario del rubro'       },
]

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${GOLD}18`, border: `1px solid ${GOLD}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: GOLD, flexShrink: 0,
      }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: TEXT }}>{title}</h2>
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`,
      borderRadius: 10, padding: '16px 20px', marginBottom: 14, ...style,
    }}>
      {children}
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: `${GOLD}20`, border: `1px solid ${GOLD}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: GOLD, marginTop: 2,
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  )
}

function Tag({ color = GOLD, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: `${color}20`,
      border: `1px solid ${color}40`, color, marginRight: 6, marginBottom: 4,
    }}>{children}</span>
  )
}

function Tip({ children }) {
  return (
    <div style={{
      background: `${GOLD}08`, border: `1px solid ${GOLD}25`,
      borderRadius: 8, padding: '10px 14px', marginTop: 12,
      fontSize: 12, color: TEXT_MUTED, lineHeight: 1.7,
    }}>
      <span style={{ color: GOLD, fontWeight: 700, marginRight: 6 }}>TIP</span>
      {children}
    </div>
  )
}

// ── Contenidos por sección ─────────────────────────────────────────────────

function SeccionAcerca() {
  return (
    <div>
      <SectionTitle icon="◈" title="Acerca de Onyria Presupuestos" />
      <Card>
        <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          <strong style={{ color: TEXT }}>Onyria Presupuestos</strong> es la herramienta interna de gestión de
          cotizaciones para Onyria Studio. Permite crear, administrar y hacer seguimiento de presupuestos
          de producción audiovisual y audio de forma rápida y profesional.
        </p>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
        {[
          { icon: '⊕', t: 'Presupuestos',  d: 'Crea cotizaciones profesionales con servicios, precios e IVA automático.' },
          { icon: '◎', t: 'IA integrada',   d: 'Pega un email o brief y la IA detecta los servicios y sugiere precios.' },
          { icon: '◉', t: 'Clientes',        d: 'Mantén una base de clientes y vincula sus presupuestos automáticamente.' },
          { icon: '⊞', t: 'Catálogo',        d: 'Define tus servicios con precios base para reutilizarlos en cada cotización.' },
        ].map(({ icon, t, d }) => (
          <Card key={t} style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.6 }}>{d}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SeccionPresupuesto() {
  return (
    <div>
      <SectionTitle icon="⊕" title="Crear un presupuesto" />

      <Card>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12 }}>
          FLUJO COMPLETO
        </div>
        <Step n="1" title="Datos del proyecto">
          Ingresa el nombre del proyecto y el tipo (Catex, Spot, Podcast, etc.). El número de
          presupuesto se genera automáticamente, pero puedes editarlo.
        </Step>
        <Step n="2" title="Datos del cliente">
          Escribe el nombre del cliente. Si ya está registrado en la base de datos, aparecerá
          el banner verde <Tag color="#22C55E">✓ Cliente registrado</Tag> y sus datos
          (empresa, email, teléfono) se cargan solos. Si no existe, puedes guardarlo como cliente
          nuevo desde el botón <Tag>+ Guardar como cliente</Tag>.
        </Step>
        <Step n="3" title="Agregar servicios">
          Usa el buscador de servicios para agregar ítems del catálogo. Puedes ajustar la
          cantidad, el precio unitario y agregar notas por ítem. También puedes agregar servicios
          libres que no están en el catálogo.
        </Step>
        <Step n="4" title="Revisar totales">
          La app calcula automáticamente el subtotal, el IVA (19%) y el total. Puedes elegir
          entre CLP y USD. El descuento y las condiciones de pago también son editables.
        </Step>
        <Step n="5" title="Guardar y hacer seguimiento">
          Guarda como <Tag color="#7A7885">Borrador</Tag> para seguir editando, o cambia el
          estado a <Tag color="#00D4FF">Enviado</Tag> una vez que lo envíes al cliente.
          Desde la lista de presupuestos puedes cambiar el estado en cualquier momento.
        </Step>
      </Card>

      <Tip>
        Puedes duplicar un presupuesto existente desde la lista de presupuestos para reutilizar
        la estructura con un cliente diferente o en un proyecto similar.
      </Tip>
    </div>
  )
}

function SeccionIA() {
  return (
    <div>
      <SectionTitle icon="◎" title="Análisis con IA" />

      <Card>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12 }}>
          CÓMO FUNCIONA
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, marginTop: 0 }}>
          Pega cualquier texto de solicitud — un email, WhatsApp, brief o descripción libre —
          y la IA detecta automáticamente todos los servicios requeridos, los cruza con el
          catálogo de Onyria y sugiere precios. El resultado se puede enviar directamente a
          un nuevo presupuesto.
        </p>

        <Step n="1" title="Pega el texto del cliente">
          Puede ser un email completo, un mensaje de WhatsApp, un brief o incluso una lista
          de ítems. Cuanto más detallado, mejor el resultado.
        </Step>
        <Step n="2" title="Analizar">
          Haz clic en Analizar con IA. La IA identificará servicios como: edición, locución,
          sonorización, casting, mix, masterización, derechos, etc.
        </Step>
        <Step n="3" title="Revisa los servicios detectados">
          Verás una tabla con cada servicio identificado, su categoría, precio sugerido y el
          fragmento del texto que lo justifica. Puedes eliminar ítems que no correspondan.
        </Step>
        <Step n="4" title="Crear presupuesto">
          Haz clic en Crear Presupuesto. Todos los servicios detectados se cargan
          automáticamente en el formulario del presupuesto, listo para ajustar y guardar.
        </Step>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>
          KEYWORDS QUE LA IA RECONOCE
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 2 }}>
          {[
            ['"armado"',        'Edición del spot o video'],
            ['"S.I."',          'Sonorización (reemplazo de audio de cámara)'],
            ['"locu de [Nombre]"', 'Locución con locutor específico'],
            ['"voz en off" / "off"', 'Locución o voice-over'],
            ['"N voces distintas"', 'Casting + Honorarios x N personajes'],
            ['"lipsync"',       'Ajuste de sincronización labial'],
            ['"mix de 15seg"',  'Mezcla de audio + Masterización'],
            ['"16:9 / 9:16 / 1:1"', 'Entrega de Archivos en múltiples formatos'],
            ['"Alt. 1 / Alt. 2"', 'Alternativas de texto para locución'],
            ['"hasta N ajustes"', 'Ajustes/revisiones incluidas'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
              <code style={{
                background: `${GOLD}15`, color: GOLD, padding: '1px 7px',
                borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap',
              }}>{k}</code>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Tip>
        Si el resultado varía entre ejecuciones, intenta hacer el texto más específico.
        Cuanto más detalle técnico incluya el cliente (duración, número de personajes,
        formatos), más precisa será la detección.
      </Tip>
    </div>
  )
}

function SeccionClientes() {
  return (
    <div>
      <SectionTitle icon="◉" title="Gestión de clientes" />

      <Card>
        <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          La sección Clientes es una base de datos de todos los clientes de Onyria Studio.
          Al vincular un cliente a un presupuesto, sus datos se autocompletaron y queda
          un registro histórico de todos sus presupuestos.
        </p>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12 }}>
          ACCIONES DISPONIBLES
        </div>
        {[
          { a: 'Crear cliente',    d: 'Agrega nombre, empresa, email y teléfono. El sistema detecta automáticamente si ya existe un cliente con ese nombre o email para evitar duplicados.' },
          { a: 'Editar cliente',   d: 'Modifica los datos de un cliente existente. Los cambios se reflejan en todos sus presupuestos vinculados.' },
          { a: 'Ver presupuestos', d: 'Haz clic en cualquier cliente de la lista para abrir su panel lateral con todos sus presupuestos, estados y totales.' },
          { a: 'Eliminar cliente', d: 'Solo se puede eliminar si el cliente no tiene presupuestos activos. Si los tiene, primero debes archivar o rechazar esos presupuestos.' },
        ].map(({ a, d }) => (
          <div key={a} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: TEXT, fontSize: 13, marginBottom: 3 }}>{a}</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.7 }}>{d}</div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>
          VINCULACIÓN AUTOMÁTICA EN PRESUPUESTOS
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          Al escribir el nombre o email de un cliente en el formulario de presupuesto, el sistema
          busca automáticamente en la base de datos. Si encuentra coincidencia, muestra el banner
          verde y carga todos sus datos. Si el cliente viene desde el Análisis con IA, la
          vinculación también es automática.
        </p>
      </Card>

      <Tip>
        Usa la barra de búsqueda en la sección Clientes para filtrar por nombre, empresa o email.
      </Tip>
    </div>
  )
}

function SeccionServicios() {
  return (
    <div>
      <SectionTitle icon="⊞" title="Catálogo de servicios" />

      <Card>
        <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          El catálogo es la lista maestra de servicios que ofrece Onyria Studio, con sus precios
          base y categorías. Estos servicios se usan como referencia al crear presupuestos
          y como base de matching para el Análisis con IA.
        </p>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12 }}>
          CATEGORÍAS
        </div>
        {[
          { c: 'Sonorización / Post / Mix', color: '#C9A84C', d: 'Edición, mezcla, masterización, sonorización, entrega de archivos.' },
          { c: 'Locución',                  color: '#00D4FF', d: 'Voice-over, narración en off, grabación de locución.' },
          { c: 'Música Original',           color: '#A855F7', d: 'Composición y producción de música a medida.' },
          { c: 'Música Archivo',            color: '#22C55E', d: 'Licenciamiento de música de librería.' },
          { c: 'Casting',                   color: '#F97316', d: 'Casting de voces, honorarios de personajes.' },
          { c: 'Podcast',                   color: '#EC4899', d: 'Producción, edición y mezcla de podcasts.' },
          { c: 'Otro',                      color: '#94A3B8', d: 'Servicios varios que no entran en otras categorías.' },
        ].map(({ c, color, d }) => (
          <div key={c} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <Tag color={color}>{c}</Tag>
            <span style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.6, paddingTop: 3 }}>{d}</span>
          </div>
        ))}
      </Card>

      <Tip>
        Mantén el catálogo actualizado con los precios vigentes. La IA usa estos precios como
        referencia para sus sugerencias. Un catálogo completo mejora la precisión del análisis.
      </Tip>
    </div>
  )
}

function SeccionEstados() {
  return (
    <div>
      <SectionTitle icon="≡" title="Estados de presupuesto" />

      <Card>
        <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          Cada presupuesto tiene un estado que refleja su situación en el proceso de venta.
          Puedes cambiar el estado desde la lista de presupuestos sin necesidad de abrirlo.
        </p>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { estado: 'Borrador',  color: '#7A7885', bg: '#1E1E24', desc: 'El presupuesto está en construcción. No ha sido enviado al cliente. Puedes editarlo libremente.' },
          { estado: 'Enviado',   color: '#00D4FF', bg: '#001A22', desc: 'Fue entregado al cliente y está esperando respuesta. Marca este estado cuando lo envíes por email o WhatsApp.' },
          { estado: 'Aceptado',  color: '#22C55E', bg: '#0A1F0E', desc: 'El cliente confirmó la cotización. El proyecto se convierte en trabajo confirmado.' },
          { estado: 'Rechazado', color: '#EF4444', bg: '#1F0A0A', desc: 'El cliente no aceptó la cotización. Este estado permite eliminar el cliente si no tiene otros presupuestos activos.' },
          { estado: 'Expirado',  color: '#F97316', bg: '#1F110A', desc: 'La cotización venció sin respuesta. Considera enviar una versión actualizada si el proyecto sigue vigente.' },
        ].map(({ estado, color, bg, desc }) => (
          <Card key={estado} style={{ marginBottom: 0, background: bg, borderColor: `${color}30` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 700, color, background: `${color}20`,
                border: `1px solid ${color}50`, whiteSpace: 'nowrap', marginTop: 1,
              }}>{estado}</span>
              <span style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.7 }}>{desc}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SeccionGlosario() {
  return (
    <div>
      <SectionTitle icon="◧" title="Glosario del rubro" />

      <Card>
        <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          Términos del rubro audio/postproducción reconocidos por el sistema y la IA.
        </p>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { t: 'Armado',           d: 'Edición o montaje de una pieza audiovisual (spot, comercial, catex).' },
          { t: 'Catex / CATEX',    d: 'Pieza publicitaria de catálogo de productos. Muy común en retail (supermercados, tiendas).' },
          { t: 'S.I.',             d: 'Sonido Internacional. Audio original de cámara que se reemplaza en postproducción. Implica el servicio de Sonorización.' },
          { t: 'Locu / Locución',  d: 'Voice-over o narración en off. "Locu de Mario" indica un locutor específico.' },
          { t: 'Voz en off / Off', d: 'Narración grabada que se escucha sobre las imágenes sin ver al locutor.' },
          { t: 'Lipsync',          d: 'Sincronización de labios: ajustar el audio para que coincida con el movimiento de boca del personaje.' },
          { t: 'Mix / Mezcla',     d: 'Proceso de combinar todos los elementos de audio (voz, música, efectos) en la pista final.' },
          { t: 'Masterización',    d: 'Proceso final de optimización del audio antes de la entrega. Siempre acompaña al mix.' },
          { t: 'Alt. / Alternativa', d: 'Versión distinta de un texto o pieza. "Alt. 1" y "Alt. 2" son dos versiones de lo mismo.' },
          { t: 'Casting',          d: 'Proceso de selección de locutores o actores de voz para el proyecto.' },
          { t: 'Honorarios',       d: 'Pago al locutor o actor contratado a través del casting.' },
          { t: 'Formatos de entrega', d: 'Versiones del video en distintos aspect ratios: 16:9 (horizontal), 9:16 (vertical/stories), 1:1 (cuadrado), 4:5 (feed).' },
          { t: 'Derechos de uso',  d: 'Licencia para usar el material en medios (TV, digital, etc.) por un período determinado.' },
          { t: 'SFX',              d: 'Efectos de sonido (Sound Effects).' },
          { t: 'BG / Background',  d: 'Música de fondo o ambiente.' },
          { t: 'Stem',             d: 'Pista de audio separada (música, efectos, diálogos) para mayor control en la mezcla.' },
          { t: 'ADR',              d: 'Grabación de diálogos de reemplazo. Se re-graba un diálogo que no quedó bien en el rodaje.' },
        ].map(({ t, d }) => (
          <Card key={t} style={{ marginBottom: 0, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <code style={{
                background: `${GOLD}15`, color: GOLD, padding: '2px 8px', borderRadius: 4,
                fontSize: 11, whiteSpace: 'nowrap', marginTop: 1, flexShrink: 0,
              }}>{t}</code>
              <span style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6 }}>{d}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

const CONTENIDOS = {
  acerca:      <SeccionAcerca />,
  presupuesto: <SeccionPresupuesto />,
  ia:          <SeccionIA />,
  clientes:    <SeccionClientes />,
  servicios:   <SeccionServicios />,
  estados:     <SeccionEstados />,
  glosario:    <SeccionGlosario />,
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Ayuda() {
  const [activa, setActiva] = useState('acerca')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Sidebar de secciones */}
      <div style={{
        width: 220, flexShrink: 0,
        background: BG_SURFACE, borderRight: `1px solid ${BORDER}`,
        padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto',
      }}>
        <div style={{
          fontSize: 10, color: TEXT_DIM, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '0 10px', marginBottom: 12,
        }}>
          Guía de uso
        </div>

        {SECCIONES.map(s => {
          const isActive = activa === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActiva(s.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 12px',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                border: 'none', fontFamily: 'inherit', fontSize: 13,
                background: isActive ? `${GOLD}15` : 'transparent',
                color: isActive ? GOLD : TEXT_MUTED,
                fontWeight: isActive ? 600 : 400,
                position: 'relative', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#ffffff08' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: '0 2px 2px 0', background: GOLD,
                }} />
              )}
              <span style={{ fontSize: 16, opacity: isActive ? 1 : 0.6 }}>{s.icon}</span>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ maxWidth: 680 }}>
          {CONTENIDOS[activa]}
        </div>
      </div>
    </div>
  )
}
