import { useState, useEffect } from 'react'
import { clientesService } from '../services/clientes.service'
import { Button, Input, Textarea, Spinner, Badge } from '../components/ui'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  GOLD, BG_CARD, BG_SURFACE, BG_HOVER, BORDER,
  TEXT, TEXT_MUTED, TEXT_DIM, ESTADOS, formatMonto,
} from '../components/theme'

const EMPTY_FORM = { nombre: '', empresa: '', email: '', telefono: '', notas: '' }

// ── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ nombre }) {
  const letra = (nombre || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${GOLD}35, #8B6914)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 700, color: GOLD,
    }}>
      {letra}
    </div>
  )
}

// ── Row action icon ──────────────────────────────────────────────────────────
function ActionIcon({ children, title, color, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? color + '20' : 'transparent',
        border: `1px solid ${hover ? color + '50' : 'transparent'}`,
        color: hover ? color : TEXT_DIM,
        borderRadius: 5, width: 28, height: 28,
        cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}

// ── Presupuesto row inside detail panel ─────────────────────────────────────
function PresupuestoRow({ p }) {
  const e = ESTADOS[p.estado] || {}
  const fecha = p.fecha_emision
    ? new Date(p.fecha_emision).toLocaleDateString('es-CL')
    : p.created_at?.split('T')[0]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderBottom: `1px solid ${BORDER}30`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: GOLD, fontSize: 12, fontWeight: 600 }}>{p.numero}</div>
        <div style={{ color: TEXT_MUTED, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.nombre_proyecto}
        </div>
      </div>
      <div style={{ color: TEXT, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {formatMonto(p.total, p.moneda)}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: e.color || TEXT_MUTED, background: (e.bg || BORDER),
        padding: '3px 9px', borderRadius: 10, whiteSpace: 'nowrap',
      }}>
        {e.label || p.estado}
      </span>
      <div style={{ color: TEXT_DIM, fontSize: 11, whiteSpace: 'nowrap' }}>{fecha}</div>
    </div>
  )
}

export default function Clientes({ addToast, onVerPresupuesto }) {
  const [clientes,    setClientes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [busqueda,    setBusqueda]    = useState('')
  const [modal,       setModal]       = useState(null)   // { mode: 'crear'|'editar', id? }
  const [confirm,     setConfirm]     = useState(null)   // { id, nombre }
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [errors,      setErrors]      = useState({})
  const [saving,      setSaving]      = useState(false)
  const [detalle,     setDetalle]     = useState(null)   // { cliente, presupuestos }
  const [loadingDet,  setLoadingDet]  = useState(false)
  const [hoveredRow,  setHoveredRow]  = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await clientesService.listar()
      setClientes(res.data || [])
    } catch {
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = clientes.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.empresa?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q)
    )
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openCrear() {
    setForm(EMPTY_FORM)
    setErrors({})
    setModal({ mode: 'crear' })
  }

  function openEditar(c) {
    setForm({ nombre: c.nombre || '', empresa: c.empresa || '', email: c.email || '', telefono: c.telefono || '', notas: c.notas || '' })
    setErrors({})
    setModal({ mode: 'editar', id: c.id })
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal.mode === 'crear') {
        const res = await clientesService.crear(form)
        setClientes(p => [...p, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        addToast('Cliente creado correctamente', 'success')
      } else {
        const res = await clientesService.actualizar(modal.id, form)
        setClientes(p => p.map(c => c.id === modal.id ? res.data : c))
        if (detalle?.cliente.id === modal.id) {
          setDetalle(d => ({ ...d, cliente: res.data }))
        }
        addToast('Cliente actualizado', 'success')
      }
      setModal(null)
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar() {
    try {
      await clientesService.eliminar(confirm.id)
      setClientes(p => p.filter(c => c.id !== confirm.id))
      if (detalle?.cliente.id === confirm.id) setDetalle(null)
      addToast('Cliente eliminado', 'success')
    } catch (err) {
      addToast(err.message || 'El cliente no pudo ser eliminado', 'error')
    } finally {
      setConfirm(null)
    }
  }

  async function verDetalle(c) {
    if (detalle?.cliente.id === c.id) { setDetalle(null); return }
    setLoadingDet(true)
    setDetalle({ cliente: c, presupuestos: [] })
    try {
      const res = await clientesService.presupuestosPorCliente(c.id)
      setDetalle({ cliente: c, presupuestos: res.data || [] })
    } catch {
      setDetalle({ cliente: c, presupuestos: [] })
    } finally {
      setLoadingDet(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Lista principal ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '28px 36px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 600 }}>Clientes</h1>
              <p style={{ margin: '5px 0 0', color: TEXT_MUTED, fontSize: 13 }}>
                {clientes.length} clientes registrados
                {filtered.length !== clientes.length && (
                  <span style={{ marginLeft: 8, color: TEXT_DIM }}>· mostrando {filtered.length}</span>
                )}
              </p>
            </div>
            <Button onClick={openCrear}>+ Nuevo Cliente</Button>
          </div>

          {/* Búsqueda */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_DIM, fontSize: 13 }}>🔍</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, empresa o email..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: BG_CARD, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '9px 14px 9px 34px',
                color: TEXT, fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = GOLD + '60' }}
              onBlur={e => { e.target.style.borderColor = BORDER }}
            />
          </div>
        </div>

        {/* Tabla */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 36px 28px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
              <Spinner size={28} />
            </div>
          ) : (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 56, textAlign: 'center', color: TEXT_DIM, fontSize: 13 }}>
                  {busqueda ? 'No se encontraron clientes con esa búsqueda' : 'No hay clientes registrados. ¡Crea el primero!'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Cliente', 'Empresa', 'Contacto', 'Acciones'].map(h => (
                        <th key={h} style={{
                          padding: '11px 16px', textAlign: 'left', fontSize: 10,
                          color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em',
                          fontWeight: 600, borderBottom: `1px solid ${BORDER}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, idx) => {
                      const isSelected = detalle?.cliente.id === c.id
                      return (
                        <tr
                          key={c.id}
                          onMouseEnter={() => setHoveredRow(c.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={() => verDetalle(c)}
                          style={{
                            borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}30` : 'none',
                            background: isSelected ? `${GOLD}10` : (hoveredRow === c.id ? BG_HOVER : 'transparent'),
                            cursor: 'pointer', transition: 'background 0.12s',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar nombre={c.nombre} />
                              <div>
                                <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{c.nombre}</div>
                                {c.notas && (
                                  <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.notas}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: TEXT_MUTED, fontSize: 13 }}>
                            {c.empresa || <span style={{ color: TEXT_DIM }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{c.email || '—'}</div>
                            <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>{c.telefono || ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                              <ActionIcon title="Ver presupuestos" color={GOLD} onClick={() => verDetalle(c)}>
                                {isSelected ? '▲' : '▼'}
                              </ActionIcon>
                              <ActionIcon title="Editar" color={GOLD} onClick={() => openEditar(c)}>✎</ActionIcon>
                              <ActionIcon title="Eliminar" color="#EF4444" onClick={() => setConfirm({ id: c.id, nombre: c.nombre })}>✕</ActionIcon>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel de detalle del cliente ──────────────────────────────────── */}
      {detalle && (
        <div style={{
          width: 420, borderLeft: `1px solid ${BORDER}`, background: BG_SURFACE,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Cabecera del detalle */}
          <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Avatar nombre={detalle.cliente.nombre} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>{detalle.cliente.nombre}</div>
                {detalle.cliente.empresa && (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 2 }}>{detalle.cliente.empresa}</div>
                )}
              </div>
              <button onClick={() => setDetalle(null)} style={{
                background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', fontSize: 18, padding: 2,
              }}>✕</button>
            </div>

            {/* Info de contacto */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {detalle.cliente.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: TEXT_DIM, fontSize: 13 }}>✉</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{detalle.cliente.email}</span>
                </div>
              )}
              {detalle.cliente.telefono && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: TEXT_DIM, fontSize: 13 }}>☎</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{detalle.cliente.telefono}</span>
                </div>
              )}
              {detalle.cliente.notas && (
                <div style={{ marginTop: 4, color: TEXT_DIM, fontSize: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
                  {detalle.cliente.notas}
                </div>
              )}
            </div>

            {/* Acciones rápidas */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button variant="secondary" onClick={() => openEditar(detalle.cliente)} style={{ fontSize: 12, padding: '6px 14px' }}>
                ✎ Editar
              </Button>
              <button
                onClick={() => setConfirm({ id: detalle.cliente.id, nombre: detalle.cliente.nombre })}
                style={{
                  background: 'none', border: `1px solid #EF444440`, borderRadius: 6,
                  color: '#EF4444', cursor: 'pointer', fontSize: 12, padding: '6px 14px',
                  fontFamily: 'inherit',
                }}
              >
                ✕ Eliminar
              </button>
            </div>
          </div>

          {/* Presupuestos del cliente */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '14px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Presupuestos
              </div>
              {!loadingDet && (
                <span style={{ color: TEXT_DIM, fontSize: 12 }}>
                  {detalle.presupuestos.length} {detalle.presupuestos.length === 1 ? 'registro' : 'registros'}
                </span>
              )}
            </div>

            {loadingDet ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner size={22} />
              </div>
            ) : detalle.presupuestos.length === 0 ? (
              <div style={{ padding: '20px 24px', color: TEXT_DIM, fontSize: 13, textAlign: 'center' }}>
                Este cliente no tiene presupuestos registrados
              </div>
            ) : (
              <div>
                {/* Resumen de totales */}
                <div style={{
                  margin: '0 24px 12px', padding: '10px 14px',
                  background: `${GOLD}08`, border: `1px solid ${GOLD}25`, borderRadius: 8,
                  display: 'flex', gap: 20,
                }}>
                  {['aceptado', 'enviado', 'borrador'].map(estado => {
                    const count = detalle.presupuestos.filter(p => p.estado === estado).length
                    if (!count) return null
                    const e = ESTADOS[estado]
                    return (
                      <div key={estado} style={{ textAlign: 'center' }}>
                        <div style={{ color: e.color, fontSize: 16, fontWeight: 700 }}>{count}</div>
                        <div style={{ color: TEXT_DIM, fontSize: 11, textTransform: 'capitalize' }}>{e.label}</div>
                      </div>
                    )
                  })}
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ color: GOLD, fontSize: 15, fontWeight: 700 }}>
                      {detalle.presupuestos.filter(p => p.estado === 'aceptado' && p.moneda === 'CLP').reduce((s, p) => s + parseFloat(p.total || 0), 0)
                        .toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ color: TEXT_DIM, fontSize: 11 }}>CLP aceptado</div>
                  </div>
                </div>

                {/* Lista de presupuestos */}
                {detalle.presupuestos.map(p => (
                  <PresupuestoRow key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal crear / editar cliente ────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal.mode === 'crear' ? 'Nuevo Cliente' : 'Editar Cliente'}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={v => setField('nombre', v)}
              error={errors.nombre}
              placeholder="Nombre del contacto"
            />
            <Input
              label="Empresa"
              value={form.empresa}
              onChange={v => setField('empresa', v)}
              placeholder="Nombre de la empresa (opcional)"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Email"
                value={form.email}
                onChange={v => setField('email', v)}
                error={errors.email}
                placeholder="correo@empresa.cl"
              />
              <Input
                label="Teléfono"
                value={form.telefono}
                onChange={v => setField('telefono', v)}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <Textarea
              label="Notas"
              value={form.notas}
              onChange={v => setField('notas', v)}
              rows={3}
              placeholder="Notas internas sobre el cliente..."
            />
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <Button onClick={guardar} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {modal.mode === 'crear' ? 'Crear Cliente' : 'Guardar Cambios'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirmar eliminación ────────────────────────────────────────────── */}
      {confirm && (
        <ConfirmDialog
          title="Eliminar Cliente"
          message={`¿Eliminar a "${confirm.nombre}"? Solo se puede eliminar si no tiene presupuestos activos.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={handleEliminar}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
