import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { serviciosService } from '../services/servicios.service'
import { Button, Input, Select, Textarea, Spinner, CategoriaPill } from '../components/ui'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  GOLD, BG_CARD, BG_BASE, BG_SURFACE, BG_HOVER, BORDER,
  TEXT, TEXT_MUTED, TEXT_DIM, CATEGORIAS, MONEDAS, UNIDADES,
  formatMonto, getCat,
} from '../components/theme'

const CATEGORIAS_VALIDAS = ['sonorizacion','locucion','musica_original','musica_archivo','casting','podcast','otro']
const MONEDAS_VALIDAS    = ['CLP','USD']
const UNIDADES_VALIDAS   = ['por pieza','por minuto','por hora','por episodio','por idioma','por proyecto','por hito','por día']

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
  const [importing,    setImporting]   = useState(false)
  const [importPreview,setImportPreview]= useState(null) // array of preview rows
  const [importSel,   setImportSel]   = useState({})    // { idx: true/false }
  const [applying,    setApplying]    = useState(false)
  const fileInputRef = useRef(null)

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

  // ── Excel export ───────────────────────────────────────────────────────────
  function exportarExcel() {
    const data = servicios.map(s => ({
      nombre:      s.nombre,
      categoria:   s.categoria,
      descripcion: s.descripcion || '',
      precio_base: s.precio_base,
      unidad:      s.unidad,
      moneda:      s.moneda,
      activo:      s.activo ? 'si' : 'no',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 50 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 8 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios')
    XLSX.writeFile(wb, 'catalogo_servicios_onyria.xlsx')
    addToast('Catálogo exportado correctamente', 'success')
  }

  // ── Excel template download ────────────────────────────────────────────────
  function descargarPlantilla() {
    const ejemplos = [
      { nombre: 'Sonorizacion 30 seg TV Digital', categoria: 'sonorizacion', descripcion: 'Post produccion publicitaria TV Digital', precio_base: 150000, unidad: 'por pieza', moneda: 'CLP', activo: 'si' },
      { nombre: 'Locucion 15 seg Solo Digital',   categoria: 'locucion',     descripcion: 'Locucion derechos Solo Digital',          precio_base: 80000,  unidad: 'por pieza', moneda: 'CLP', activo: 'si' },
      { nombre: 'Musica Archivo TV',               categoria: 'musica_archivo', descripcion: 'Licencia musica de archivo para TV',  precio_base: 200,    unidad: 'por pieza', moneda: 'USD', activo: 'si' },
    ]
    const ws = XLSX.utils.json_to_sheet(ejemplos)
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 50 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 8 }]

    // Agregar nota con categorías válidas en una segunda hoja
    const wsInfo = XLSX.utils.aoa_to_sheet([
      ['CAMPO',        'VALORES VÁLIDOS',                                                            'OBLIGATORIO'],
      ['nombre',       'Texto libre',                                                                 'Sí'],
      ['categoria',    CATEGORIAS_VALIDAS.join(' | '),                                               'Sí'],
      ['descripcion',  'Texto libre',                                                                 'No'],
      ['precio_base',  'Número (ej: 150000)',                                                        'Sí'],
      ['unidad',       UNIDADES_VALIDAS.join(' | '),                                                 'Sí'],
      ['moneda',       'CLP | USD',                                                                  'Sí'],
      ['activo',       'si | no',                                                                    'No (default: si)'],
    ])
    wsInfo['!cols'] = [{ wch: 16 }, { wch: 80 }, { wch: 14 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios')
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones')
    XLSX.writeFile(wb, 'plantilla_servicios_onyria.xlsx')
    addToast('Plantilla descargada', 'success')
  }

  // ── Excel import — paso 1: previsualizar ──────────────────────────────────
  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    fileInputRef.current.value = ''
    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb     = XLSX.read(buffer, { type: 'array' })
      const ws     = wb.Sheets[wb.SheetNames[0]]
      const rows   = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const preview = []
      for (const [i, row] of rows.entries()) {
        const nombre    = String(row.nombre || '').trim()
        const categoria = String(row.categoria || '').trim().toLowerCase()
        const precio    = parseFloat(String(row.precio_base).replace(',', '.')) || 0
        const unidad    = String(row.unidad || 'por pieza').trim()
        const moneda    = String(row.moneda  || 'CLP').trim().toUpperCase()
        const activo    = String(row.activo  || 'si').trim().toLowerCase() !== 'no'
        const desc      = String(row.descripcion || '').trim()

        // Validar
        let error = null
        if (!nombre) error = 'Nombre vacío'
        else if (!CATEGORIAS_VALIDAS.includes(categoria)) error = `Categoría inválida: "${categoria}"`
        else if (!MONEDAS_VALIDAS.includes(moneda)) error = `Moneda inválida: "${moneda}"`

        if (error) {
          preview.push({ fila: i + 2, nombre: nombre || '—', error, estado: 'error', data: null, existente: null, cambios: [] })
          continue
        }

        const data = { nombre, categoria, descripcion: desc, precio_base: precio, unidad, moneda, activo }

        // Buscar si existe por nombre (case-insensitive)
        const existente = servicios.find(s => s.nombre.toLowerCase() === nombre.toLowerCase())

        let estado = 'nuevo'
        let cambios = []
        if (existente) {
          const CAMPOS = [
            { key: 'categoria',   label: 'Categoría'   },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'precio_base', label: 'Precio',     fn: v => parseFloat(v) || 0 },
            { key: 'unidad',      label: 'Unidad'      },
            { key: 'moneda',      label: 'Moneda'      },
            { key: 'activo',      label: 'Estado'      },
          ]
          for (const c of CAMPOS) {
            const vAntes = c.fn ? c.fn(existente[c.key]) : existente[c.key]
            const vDespues = c.fn ? c.fn(data[c.key])    : data[c.key]
            if (String(vAntes) !== String(vDespues)) {
              cambios.push({ label: c.label, antes: vAntes, despues: vDespues })
            }
          }
          estado = cambios.length > 0 ? 'modificado' : 'igual'
        }

        preview.push({ fila: i + 2, nombre, estado, data, existente: existente || null, cambios, error: null })
      }

      // Pre-seleccionar nuevos y modificados
      const sel = {}
      preview.forEach((r, i) => { if (r.estado === 'nuevo' || r.estado === 'modificado') sel[i] = true })
      setImportPreview(preview)
      setImportSel(sel)
    } catch (err) {
      addToast('Error al leer el archivo: ' + err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  // ── Excel import — paso 2: aplicar selección ───────────────────────────────
  async function aplicarImport() {
    setApplying(true)
    let ok = 0, errores = 0
    try {
      for (const [i, row] of importPreview.entries()) {
        if (!importSel[i] || row.estado === 'igual' || row.estado === 'error') continue
        try {
          if (row.estado === 'nuevo') {
            await serviciosService.crear(row.data)
          } else if (row.estado === 'modificado') {
            await serviciosService.actualizar(row.existente.id, row.data)
          }
          ok++
        } catch { errores++ }
      }
      await loadServicios()
      setImportPreview(null)
      setImportSel({})
      if (ok > 0) addToast(`${ok} servicio(s) aplicados correctamente`, 'success')
      if (errores > 0) addToast(`${errores} error(es) al aplicar`, 'error')
    } finally {
      setApplying(false)
    }
  }

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
            <Button variant="secondary" onClick={descargarPlantilla} title="Descarga una plantilla Excel con el formato correcto">
              ↓ Plantilla
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={importing}>
              ↑ Importar Excel
            </Button>
            <Button variant="secondary" onClick={exportarExcel} disabled={servicios.length === 0}>
              ↓ Exportar Excel
            </Button>
            <Button onClick={openCrear}>+ Nuevo Servicio</Button>
          </div>
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

      {/* ── Modal previsualización importación ─────────────────────────── */}
      {importPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000000CC',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#16161A', border: `1px solid ${BORDER}`, borderRadius: 12,
            width: '100%', maxWidth: 900, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>Previsualización de importación</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
                    {importPreview.filter(r => r.estado === 'nuevo').length} nuevos ·{' '}
                    {importPreview.filter(r => r.estado === 'modificado').length} modificados ·{' '}
                    {importPreview.filter(r => r.estado === 'igual').length} sin cambios ·{' '}
                    {importPreview.filter(r => r.estado === 'error').length} con error
                  </div>
                </div>
                <button onClick={() => setImportPreview(null)} style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', fontSize: 20 }}>✕</button>
              </div>
              {/* Seleccionar todo */}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const sel = {}
                    importPreview.forEach((r, i) => { if (r.estado === 'nuevo' || r.estado === 'modificado') sel[i] = true })
                    setImportSel(sel)
                  }}
                  style={{ fontSize: 12, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Seleccionar todos
                </button>
                <button
                  onClick={() => setImportSel({})}
                  style={{ fontSize: 12, color: TEXT_MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Deseleccionar todos
                </button>
              </div>
            </div>

            {/* Tabla */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#111114', zIndex: 1 }}>
                  <tr>
                    {['', 'Estado', 'Nombre', 'Cambios / Detalle'].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: 11,
                        color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontWeight: 600, borderBottom: `1px solid ${BORDER}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => {
                    const canSelect = row.estado === 'nuevo' || row.estado === 'modificado'
                    const isSelected = !!importSel[i]
                    const COLOR = {
                      nuevo:      '#22C55E',
                      modificado: '#F97316',
                      igual:      TEXT_DIM,
                      error:      '#EF4444',
                    }[row.estado]
                    const LABEL = {
                      nuevo: 'Nuevo', modificado: 'Modificado', igual: 'Sin cambios', error: 'Error',
                    }[row.estado]

                    return (
                      <tr key={i} style={{
                        background: isSelected ? `${COLOR}08` : 'transparent',
                        opacity: row.estado === 'igual' ? 0.5 : 1,
                        borderBottom: `1px solid ${BORDER}20`,
                      }}>
                        {/* Checkbox */}
                        <td style={{ padding: '10px 14px', width: 40 }}>
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => setImportSel(s => ({ ...s, [i]: e.target.checked }))}
                              style={{ accentColor: GOLD, width: 15, height: 15, cursor: 'pointer' }}
                            />
                          )}
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '10px 14px', width: 110 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: COLOR,
                            background: COLOR + '20', padding: '3px 10px', borderRadius: 20,
                            whiteSpace: 'nowrap',
                          }}>{LABEL}</span>
                        </td>

                        {/* Nombre */}
                        <td style={{ padding: '10px 14px', fontSize: 13, color: TEXT, fontWeight: 500 }}>
                          {row.nombre}
                          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Fila {row.fila}</div>
                        </td>

                        {/* Cambios / detalle */}
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {row.estado === 'error' && (
                            <span style={{ color: '#EF4444' }}>{row.error}</span>
                          )}
                          {row.estado === 'nuevo' && (
                            <span style={{ color: TEXT_MUTED }}>
                              {row.data?.categoria} · {row.data?.moneda} {row.data?.precio_base?.toLocaleString('es-CL')}
                            </span>
                          )}
                          {row.estado === 'igual' && (
                            <span style={{ color: TEXT_DIM }}>Sin diferencias</span>
                          )}
                          {row.estado === 'modificado' && row.cambios.map((c, j) => (
                            <div key={j} style={{ marginBottom: 2 }}>
                              <span style={{ color: TEXT_DIM }}>{c.label}: </span>
                              <span style={{ color: '#EF4444', textDecoration: 'line-through', marginRight: 6 }}>
                                {String(c.antes)}
                              </span>
                              <span style={{ color: '#22C55E' }}>→ {String(c.despues)}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: `1px solid ${BORDER}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                {Object.values(importSel).filter(Boolean).length} seleccionado(s) para aplicar
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setImportPreview(null)}>Cancelar</Button>
                <Button
                  onClick={aplicarImport}
                  loading={applying}
                  disabled={Object.values(importSel).filter(Boolean).length === 0}
                >
                  Aplicar selección
                </Button>
              </div>
            </div>
          </div>
        </div>
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
