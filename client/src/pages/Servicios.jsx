import { useState, useEffect } from 'react'
import { serviciosService } from '../services/servicios.service'
import { Button, Input, Select, Textarea, Spinner, CategoriaPill } from '../components/ui'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  GOLD, BG_CARD, BG_BASE, BG_SURFACE, BG_HOVER, BORDER,
  TEXT, TEXT_MUTED, TEXT_DIM, CATEGORIAS, MONEDAS, UNIDADES,
  formatMonto, getCat,
} from '../components/theme'

const CAT_OPTIONS  = CATEGORIAS.map(c => ({ value: c.id, label: c.label }))
const UNIT_OPTIONS = UNIDADES.map(u => ({ value: u, label: u }))
const EMPTY = { nombre: '', categoria: 'sonorizacion', descripcion: '', precio_base: 0, unidad: 'por pieza', moneda: 'CLP', activo: true }

// ── Column definitions ─────────────────────────────────────────────────────
const COLS = [
  { key: 'categoria',   label: 'Categoría',   sortable: true,  width: 180 },
  { key: 'nombre',      label: 'Nombre',       sortable: true,  width: 'auto' },
  { key: 'descripcion', label: 'Descripción',  sortable: false, width: 340 },
  { key: 'precio_base', label: 'Precio',       sortable: true,  width: 150, align: 'right' },
  { key: 'unidad',      label: 'Unidad',       sortable: false, width: 110 },
  { key: 'activo',      label: 'Estado',       sortable: true,  width: 90,  align: 'center' },
]

// ── Pill button helper ─────────────────────────────────────────────────────
function FilterPill({ label, active, color = TEXT_MUTED, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? (color + '22') : 'transparent',
      color: active ? color : TEXT_MUTED,
      border: `1px solid ${active ? color + '55' : BORDER}`,
      borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
      fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: 'inherit',
      letterSpacing: '0.03em', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

// ── Sort indicator ─────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ color: TEXT_DIM, marginLeft: 4, fontSize: 10 }}>⇅</span>
  return <span style={{ color: GOLD, marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export default function Servicios({ addToast }) {
  const [servicios,    setServicios]   = useState([])
  const [loading,      setLoading]     = useState(true)
  const [busqueda,     setBusqueda]    = useState('')
  const [filtroCateg,  setFiltroCateg] = useState('todos')
  const [filtroMoneda, setFiltroMoneda]= useState('todos')
  const [filtroEstado, setFiltroEstado]= useState('todos')
  const [sortCol,      setSortCol]     = useState('categoria')
  const [sortDir,      setSortDir]     = useState('asc')
  const [modal,        setModal]       = useState(null)
  const [confirm,      setConfirm]     = useState(null)
  const [form,         setForm]        = useState(EMPTY)
  const [saving,       setSaving]      = useState(false)
  const [errors,       setErrors]      = useState({})
  const [hoveredRow,   setHoveredRow]  = useState(null)

  useEffect(() => { loadServicios() }, [])

  async function loadServicios() {
    setLoading(true)
    try {
      const res = await serviciosService.listar()
      setServicios(res.data || [])
    } catch {
      setServicios([])
    } finally {
      setLoading(false)
    }
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = servicios
    .filter(s => {
      if (filtroCateg  !== 'todos' && s.categoria !== filtroCateg) return false
      if (filtroMoneda !== 'todos' && s.moneda !== filtroMoneda)   return false
      if (filtroEstado === 'activo'   && !s.activo)  return false
      if (filtroEstado === 'inactivo' &&  s.activo)  return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const inNombre = s.nombre.toLowerCase().includes(q)
        const inDesc   = (s.descripcion || '').toLowerCase().includes(q)
        if (!inNombre && !inDesc) return false
      }
      return true
    })
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (sortCol === 'precio_base') { va = Number(va); vb = Number(vb) }
      else if (sortCol === 'activo') { va = va ? 1 : 0; vb = vb ? 1 : 0 }
      else { va = String(va ?? '').toLowerCase(); vb = String(vb ?? '').toLowerCase() }
      if (va === vb) return 0
      return (sortDir === 'asc' ? 1 : -1) * (va > vb ? 1 : -1)
    })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  function openCrear()    { setForm(EMPTY);    setErrors({}); setModal({ mode: 'crear' }) }
  function openEditar(s)  { setForm({ ...s }); setErrors({}); setModal({ mode: 'editar', id: s.id }) }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal.mode === 'crear') {
        const res = await serviciosService.crear(form)
        setServicios(p => [...p, res.data])
        addToast('Servicio creado correctamente', 'success')
      } else {
        await serviciosService.actualizar(modal.id, form)
        setServicios(p => p.map(s => s.id === modal.id ? { ...form, id: modal.id } : s))
        addToast('Servicio actualizado', 'success')
      }
      setModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar() {
    try {
      await serviciosService.eliminar(confirm.id)
      setServicios(p => p.filter(s => s.id !== confirm.id))
      addToast('Servicio eliminado', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  async function toggleActivo(s) {
    try {
      await serviciosService.actualizar(s.id, { ...s, activo: !s.activo })
      setServicios(p => p.map(x => x.id === s.id ? { ...x, activo: !x.activo } : x))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const activos   = servicios.filter(s => s.activo).length
  const sinPrecio = servicios.filter(s => !s.precio_base).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 36px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 600 }}>
              Catálogo de Servicios
            </h1>
            <p style={{ margin: '5px 0 0', color: TEXT_MUTED, fontSize: 13 }}>
              {servicios.length} servicios · {activos} activos
              {sinPrecio > 0 && (
                <span style={{ marginLeft: 10, color: '#F97316', fontWeight: 600 }}>· ⚠ {sinPrecio} sin precio</span>
              )}
              {filtered.length !== servicios.length && (
                <span style={{ marginLeft: 10, color: TEXT_DIM }}>· mostrando {filtered.length}</span>
              )}
            </p>
          </div>
          <Button onClick={openCrear}>+ Nuevo Servicio</Button>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>

          {/* Row 1: search + moneda + estado */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_DIM, fontSize: 13 }}>🔍</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar nombre o descripción..."
                style={{
                  width: 240, background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: '7px 12px 7px 30px', color: TEXT, fontSize: 13,
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e  => { e.target.style.borderColor = GOLD + '60' }}
                onBlur={e   => { e.target.style.borderColor = BORDER }}
              />
            </div>

            <div style={{ width: 1, height: 20, background: BORDER, flexShrink: 0 }} />

            {/* Moneda */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: TEXT_MUTED, marginRight: 2 }}>Moneda</span>
              {[{ v: 'todos', l: 'Todas' }, { v: 'CLP', l: 'CLP' }, { v: 'USD', l: 'USD' }].map(m => (
                <FilterPill key={m.v} label={m.l} active={filtroMoneda === m.v} color={GOLD} onClick={() => setFiltroMoneda(m.v)} />
              ))}
            </div>

            <div style={{ width: 1, height: 20, background: BORDER, flexShrink: 0 }} />

            {/* Estado */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: TEXT_MUTED, marginRight: 2 }}>Estado</span>
              {[
                { v: 'todos',    l: 'Todos',     color: TEXT_MUTED },
                { v: 'activo',   l: 'Activos',   color: '#22C55E'  },
                { v: 'inactivo', l: 'Inactivos', color: '#EF4444'  },
              ].map(e => (
                <FilterPill key={e.v} label={e.l} active={filtroEstado === e.v} color={e.color} onClick={() => setFiltroEstado(e.v)} />
              ))}
            </div>
          </div>

          {/* Row 2: category pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <FilterPill label="Todas las categorías" active={filtroCateg === 'todos'} color={TEXT_MUTED} onClick={() => setFiltroCateg('todos')} />
            {CATEGORIAS.map(cat => (
              <FilterPill key={cat.id} label={cat.label} active={filtroCateg === cat.id} color={cat.color} onClick={() => setFiltroCateg(cat.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 36px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <Spinner size={28} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>

            {/* Sticky header */}
            <colgroup>
              {COLS.map(c => <col key={c.key} style={{ width: c.width === 'auto' ? undefined : c.width }} />)}
              <col style={{ width: 96 }} />
            </colgroup>
            <thead>
              <tr style={{ background: BG_SURFACE, position: 'sticky', top: 0, zIndex: 10 }}>
                {COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    style={{
                      padding: '10px 14px',
                      textAlign: col.align || 'left',
                      fontSize: 12, fontWeight: 700, color: sortCol === col.key ? GOLD : TEXT_MUTED,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      borderBottom: `1px solid ${BORDER}`,
                      borderTop: `1px solid ${BORDER}`,
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                  </th>
                ))}
                <th style={{
                  padding: '10px 14px', textAlign: 'center',
                  fontSize: 12, fontWeight: 700, color: TEXT_MUTED,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  borderBottom: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}`,
                }}>
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length + 1} style={{ padding: 48, textAlign: 'center', color: TEXT_DIM, fontSize: 13 }}>
                    No se encontraron servicios con los filtros aplicados
                  </td>
                </tr>
              ) : filtered.map((s, idx) => {
                const cat     = getCat(s.categoria)
                const isHover = hoveredRow === s.id
                return (
                  <tr
                    key={s.id}
                    onMouseEnter={() => setHoveredRow(s.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: isHover ? BG_HOVER : (idx % 2 === 0 ? 'transparent' : BG_SURFACE + '60'),
                      opacity: s.activo ? 1 : 0.5,
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* Categoría */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30` }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: cat.color,
                        background: cat.color + '15', padding: '4px 10px',
                        borderRadius: 20, whiteSpace: 'nowrap',
                      }}>
                        {cat.label}
                      </span>
                    </td>

                    {/* Nombre */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30` }}>
                      <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>{s.nombre}</span>
                    </td>

                    {/* Descripción */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30` }}>
                      <span style={{
                        color: TEXT_MUTED, fontSize: 13,
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        lineHeight: 1.5,
                      }}>
                        {s.descripcion || '—'}
                      </span>
                    </td>

                    {/* Precio */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30`, textAlign: 'right' }}>
                      {s.precio_base > 0 ? (
                        <span style={{ color: GOLD, fontSize: 15, fontWeight: 700 }}>
                          {formatMonto(s.precio_base, s.moneda)}
                        </span>
                      ) : (
                        <span style={{ color: '#F97316', fontSize: 13, fontWeight: 600 }}>⚠ Sin precio</span>
                      )}
                    </td>

                    {/* Unidad */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30` }}>
                      <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{s.unidad}</span>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30`, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                        color:       s.activo ? '#22C55E' : TEXT_MUTED,
                        background:  s.activo ? '#22C55E18' : BORDER,
                        padding: '3px 10px', borderRadius: 10,
                      }}>
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}30`, textAlign: 'center' }}>
                      <div style={{
                        display: 'flex', gap: 4, justifyContent: 'center',
                        opacity: isHover ? 1 : 0.3, transition: 'opacity 0.15s',
                      }}>
                        <ActionIcon title="Editar" color={GOLD} onClick={() => openEditar(s)}>✎</ActionIcon>
                        <ActionIcon
                          title={s.activo ? 'Desactivar' : 'Activar'}
                          color={s.activo ? '#F97316' : '#22C55E'}
                          onClick={() => toggleActivo(s)}
                        >
                          {s.activo ? '○' : '●'}
                        </ActionIcon>
                        <ActionIcon title="Eliminar" color="#EF4444" onClick={() => setConfirm({ id: s.id, nombre: s.nombre })}>
                          ✕
                        </ActionIcon>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal crear / editar ─────────────────────────────────────────── */}
      {modal && (
        <Modal title={modal.mode === 'crear' ? 'Nuevo Servicio' : 'Editar Servicio'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Nombre del Servicio *" value={form.nombre} onChange={v => setField('nombre', v)} error={errors.nombre} />
            <Select label="Categoría" value={form.categoria} onChange={v => setField('categoria', v)} options={CAT_OPTIONS} />
            <Textarea label="Descripción" value={form.descripcion} onChange={v => setField('descripcion', v)} rows={3} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Precio Base" type="number" value={form.precio_base} onChange={v => setField('precio_base', parseFloat(v) || 0)} />
              <Select label="Moneda" value={form.moneda} onChange={v => setField('moneda', v)} options={MONEDAS} />
            </div>
            <Select label="Unidad" value={form.unidad} onChange={v => setField('unidad', v)} options={UNIT_OPTIONS} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <input
                type="checkbox" id="activo" checked={form.activo}
                onChange={e => setField('activo', e.target.checked)}
                style={{ accentColor: GOLD, width: 16, height: 16 }}
              />
              <label htmlFor="activo" style={{ fontSize: 13, color: TEXT_MUTED, cursor: 'pointer' }}>Servicio activo</label>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <Button onClick={guardar} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>Guardar</Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Eliminar Servicio"
          message={`¿Eliminar "${confirm.nombre}"? Si está en uso en presupuestos, el registro se conservará.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={handleEliminar}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ── Inline action icon button ──────────────────────────────────────────────
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
        borderRadius: 5, width: 26, height: 26,
        cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}
