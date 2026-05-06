import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { presupuestosService } from '../services/presupuestos.service'
import { serviciosService } from '../services/servicios.service'
import { clientesService } from '../services/clientes.service'
import { Button, Input, Select, Textarea } from '../components/ui'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ExcelDiffModal } from '../components/ui/ExcelDiffModal'
import { PDFPreview } from '../components/pdf/PDFPreview'
import { exportarPresupuestoExcel } from '../utils/exportPresupuesto'
import {
  GOLD, CYAN, BG_CARD, BG_BASE, BG_SURFACE, BORDER,
  TEXT, TEXT_MUTED, TEXT_DIM,
  CATEGORIAS, MONEDAS, formatMonto,
} from '../components/theme'

const CATEGORIAS_SELECT = CATEGORIAS.map(c => ({ value: c.id, label: c.label }))

const DEFAULT_CONDITIONS = `Condiciones de pago: 30 a 60 días desde la facturación.
Una vez aprobada esta cotización, se deberá enviar Orden de Compra para empezar la producción.
Se permitirá solo dos cambios por armado por motivos de cambios de guión, o texto. (Las correcciones de guión por exceso de duración de la pieza, serán consideradas como cambio).
La cantidad de producción o servicios asociada a presupuestos que se consideren paquete o fee mensual tienen un plazo para realizar dicha producción dentro de los días hábiles del mismo mes, por lo que no son acumulables.
No está autorizado el uso parcial o total de este material en otras piezas comerciales u otros medios de difusión, que no se especifique en esta cotización.
Todos los trabajos consideran derechos por 12 meses, salvo que se especifique algo distinto en el detalle de la cotización.
Los trabajos en producción o terminados, tienen un plazo activo de un máximo de 1 mes desde su fecha de inicio. Cualquier cambio posterior a ese plazo de tiempo, queda afecto a un costo adicional. Así mismo, la publicación o salida al aire de una pieza considera el trabajo como finalizado.
El inicio de los derechos que contempla cada pieza comienzan a regir desde el momento que se entrega el final, a menos que ambas partes acuerden lo contrario.`

function makeItem() {
  return {
    id: Date.now() + Math.random(),
    descripcion: '', categoria: 'sonorizacion',
    cantidad: 1, precioUnitario: 0, notas: '', fragmento_cliente: '', porcentajeBoleta: 0,
  }
}

// ── ServiceCombobox ────────────────────────────────────────────────────────
function ServiceCombobox({ value, onChange, onSelectService, options }) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState(value)
  const [pos,    setPos]    = useState({ top: 0, left: 0, width: 320, above: false })
  const inputRef = useRef(null)

  useEffect(() => { setQuery(value) }, [value])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (inputRef.current && !inputRef.current.closest('[data-combobox]')?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function calcPos() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < 260 && rect.top > spaceBelow
    setPos({
      left:  rect.left,
      width: Math.max(rect.width, 380),
      top:   above ? rect.top  : rect.bottom + 4,
      above,
    })
  }

  const suggestions = options.filter(s =>
    !query || s.nombre.toLowerCase().includes(query.toLowerCase())
  )

  function handleInput(val) {
    setQuery(val)
    onChange(val)
    calcPos()
    setOpen(true)
  }

  function handleFocus() {
    calcPos()
    setOpen(true)
  }

  function handleSelect(s) {
    setQuery(s.nombre)
    setOpen(false)
    onSelectService(s)
  }

  return (
    <div data-combobox="1" style={{ width: '100%' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={handleFocus}
        placeholder={options.length ? 'Buscar o escribir…' : 'Descripción personalizada…'}
        style={{
          background: 'transparent', border: 'none', color: TEXT,
          fontSize: 14, outline: 'none', width: '100%', fontFamily: 'inherit',
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'fixed',
          top:    pos.above ? undefined : pos.top,
          bottom: pos.above ? window.innerHeight - pos.top + 4 : undefined,
          left:   pos.left,
          width:  pos.width,
          zIndex: 9999,
          background: BG_CARD, border: `1px solid ${BORDER}`,
          borderRadius: 8, maxHeight: 260, overflowY: 'auto',
          boxShadow: '0 8px 32px #00000080',
        }}>
          {suggestions.map(s => (
            <div
              key={s.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
              style={{
                padding: '9px 14px', cursor: 'pointer',
                borderBottom: `1px solid ${BORDER}30`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>{s.nombre}</div>
                {s.descripcion && (
                  <div style={{
                    fontSize: 12, color: TEXT_DIM, marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260,
                  }}>{s.descripcion}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: GOLD, fontWeight: 600,  }}>
                  {formatMonto(s.precio_base, s.moneda)}
                </div>
                <div style={{ fontSize: 11, color: TEXT_DIM }}>{s.unidad}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── NuevoPresupuesto ───────────────────────────────────────────────────────
export default function NuevoPresupuesto({ datosIA, editandoId, addToast }) {
  const navigate = useNavigate()

  const [servicios,       setServicios]       = useState([])
  const [showPreview,     setShowPreview]     = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [loadingEdit,     setLoadingEdit]     = useState(!!editandoId)
  const [errors,          setErrors]          = useState({})
  const [confirmLimpiar,  setConfirmLimpiar]  = useState(false)
  const [clientesBD,      setClientesBD]      = useState([])
  const [clienteIdVinculado, setClienteIdVinculado] = useState(null)
  const [clienteSugs,     setClienteSugs]     = useState([])
  const [showClienteDrop, setShowClienteDrop] = useState(false)
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [modalCrearCliente, setModalCrearCliente] = useState(false)
  const [ajusteActivo,    setAjusteActivo]    = useState(false)
  const [ajusteTotal,     setAjusteTotal]     = useState('')
  const [ajusteMotivo,    setAjusteMotivo]    = useState('')
  const [diffModal,       setDiffModal]       = useState(null)
  const [excelLoading,    setExcelLoading]    = useState(false)

  const [items, setItems] = useState(
    datosIA?.servicios?.length
      ? datosIA.servicios.map((s, i) => ({
          id:               i + 1,
          descripcion:      s.catalogo_nombre || s.nombre_servicio,
          categoria:        s.categoria       || 'otro',
          cantidad:         s.cantidad        || 1,
          precioUnitario:   parseFloat(s.precio_unitario) || 0,
          notas:            [s.descripcion_detalle, s.notas_tecnicas].filter(Boolean).join(' · ') || '',
          fragmento_cliente: s.fragmento_texto || '',
          porcentajeBoleta: 0,
        }))
      : [makeItem()]
  )

  const [form, setForm] = useState({
    cliente:         datosIA?.cliente?.nombre   || '',
    empresa:         datosIA?.cliente?.empresa  || '',
    email_cliente:   datosIA?.cliente?.email    || '',
    telefono:        datosIA?.cliente?.telefono || '',
    nombre_proyecto: datosIA?.proyecto?.nombre  || '',
    tipo_proyecto:   datosIA?.proyecto?.tipo    || '',
    numero:          `ONY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    fecha:           new Date().toISOString().split('T')[0],
    validez:         '30',
    moneda:          'CLP',
    descuento:       '0',
    iva:             '19',
    notas:           '',
    condiciones:     DEFAULT_CONDITIONS,
  })

  // Load catalog + clients
  useEffect(() => {
    serviciosService.listar({ activo: 'true' })
      .then(res => setServicios(res.data || []))
      .catch(() => {})
    clientesService.listar()
      .then(res => setClientesBD(res.data || []))
      .catch(() => {})
  }, [])

  // Cuando el catálogo carga y los items vienen de datosIA, completar porcentajeBoleta desde el catálogo
  useEffect(() => {
    if (!datosIA || !servicios.length) return
    setItems(prev => prev.map(item => {
      if (item.porcentajeBoleta) return item
      const match = servicios.find(s => s.nombre.toLowerCase() === item.descripcion.toLowerCase())
      return match ? { ...item, porcentajeBoleta: parseFloat(match.porcentaje_boleta) || 0 } : item
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicios])

  // Auto-validar cliente cuando se carga la lista (datosIA o nuevo presupuesto con nombre ya relleno)
  useEffect(() => {
    if (!clientesBD.length || clienteIdVinculado) return
    const nombre = form.cliente?.trim()
    const email  = form.email_cliente?.trim()
    if (!nombre) return

    let encontrado = null
    if (email) encontrado = clientesBD.find(c => c.email?.toLowerCase() === email.toLowerCase())
    if (!encontrado) encontrado = clientesBD.find(c => c.nombre?.toLowerCase() === nombre.toLowerCase())

    if (encontrado) {
      setClienteIdVinculado(encontrado.id)
      setForm(f => ({
        ...f,
        cliente:       encontrado.nombre    || f.cliente,
        empresa:       encontrado.empresa   || f.empresa,
        email_cliente: encontrado.email     || f.email_cliente,
        telefono:      encontrado.telefono  || f.telefono,
      }))
    }
  // Solo corre cuando clientesBD se carga — no en cada tecla
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientesBD])

  // Load existing presupuesto when editing
  useEffect(() => {
    if (!editandoId) return
    setLoadingEdit(true)
    presupuestosService.obtener(editandoId)
      .then(res => {
        const p = res.data
        if (p.cliente_id) {
          setClienteIdVinculado(p.cliente_id)
        } else if (p.cliente_nombre) {
          // Buscar en clientesBD ya cargados (puede estar disponible si cargó antes)
          setClientesBD(prev => {
            const nombre = p.cliente_nombre?.toLowerCase()
            const email  = p.cliente_email?.toLowerCase()
            const found  = prev.find(c =>
              (email && c.email?.toLowerCase() === email) ||
              c.nombre?.toLowerCase() === nombre
            )
            if (found) {
              setClienteIdVinculado(found.id)
              setForm(f => ({
                ...f,
                cliente:       found.nombre   || f.cliente,
                empresa:       found.empresa  || f.empresa,
                email_cliente: found.email    || f.email_cliente,
                telefono:      found.telefono || f.telefono,
              }))
            }
            return prev
          })
        }
        setForm({
          cliente:         p.cliente_nombre    || '',
          empresa:         p.cliente_empresa   || '',
          email_cliente:   p.cliente_email     || '',
          telefono:        p.cliente_telefono  || '',
          nombre_proyecto: p.nombre_proyecto   || '',
          tipo_proyecto:   p.tipo_proyecto     || '',
          numero:          p.numero            || '',
          fecha:           p.fecha_emision?.split('T')[0] || new Date().toISOString().split('T')[0],
          validez:         String(p.validez_dias || 30),
          moneda:          p.moneda            || 'CLP',
          descuento:       String(p.descuento  ?? 0),
          iva:             '19',
          notas:           p.notas             || '',
          condiciones:     p.condiciones       || DEFAULT_CONDITIONS,
        })
        if (p.ajuste_total != null && p.ajuste_total !== '') {
          setAjusteActivo(true)
          setAjusteTotal(String(p.ajuste_total))
          setAjusteMotivo(p.ajuste_motivo || '')
        } else {
          setAjusteActivo(false)
          setAjusteTotal('')
          setAjusteMotivo('')
        }
        setItems(
          p.items?.length
            ? p.items.map(item => ({
                id:               Date.now() + Math.random(),
                descripcion:      item.descripcion_personalizada || '',
                categoria:        item.categoria || 'sonorizacion',
                cantidad:         item.cantidad  || 1,
                precioUnitario:   parseFloat(item.precio_unitario) || 0,
                notas:            item.notas     || '',
                fragmento_cliente: item.fragmento_cliente || '',
                porcentajeBoleta: parseFloat(item.porcentaje_boleta) || 0,
              }))
            : [makeItem()]
        )
      })
      .catch(() => addToast('Error al cargar el presupuesto', 'error'))
      .finally(() => setLoadingEdit(false))
  }, [editandoId])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const itemSubtotal   = (i) => i.cantidad * i.precioUnitario * (1 + (i.porcentajeBoleta || 0) / 100)
  const subtotal       = items.reduce((s, i) => s + itemSubtotal(i), 0)
  const descuentoMonto = subtotal * (parseFloat(form.descuento || 0) / 100)
  const netoCal        = subtotal - descuentoMonto                                                         // neto sin ajuste
  const baseImponible  = ajusteActivo && ajusteTotal !== '' ? parseFloat(ajusteTotal) || 0 : netoCal       // neto que paga el cliente
  const ivaMonto       = baseImponible * (parseFloat(form.iva || 0) / 100)
  const totalFinal     = baseImponible + ivaMonto
  const fmt            = (n) => formatMonto(n, form.moneda)

  function addItem()            { setItems(p => [...p, makeItem()]) }
  function removeItem(id)       { setItems(p => p.filter(i => i.id !== id)) }
  function updateItem(id, k, v) { setItems(p => p.map(i => i.id === id ? { ...i, [k]: v } : i)) }

  function selectServicio(itemId, servicio) {
    setItems(prev => prev.map(i => i.id === itemId ? {
      ...i,
      descripcion:      servicio.nombre,
      precioUnitario:   parseFloat(servicio.precio_base) || 0,
      notas:            servicio.descripcion || '',
      porcentajeBoleta: parseFloat(servicio.porcentaje_boleta) || 0,
    } : i))
  }

  // Búsqueda derivada: cliente que coincide EXACTAMENTE con el form actual
  const clienteExistente = useMemo(() => {
    const nombreLower = form.cliente.trim().toLowerCase()
    const emailLower  = form.email_cliente.trim().toLowerCase()
    if (!nombreLower) return null
    return clientesBD.find(c =>
      (emailLower && c.email?.toLowerCase() === emailLower) ||
      c.nombre?.toLowerCase() === nombreLower
    ) || null
  }, [clientesBD, form.cliente, form.email_cliente])

  // Sincronizar estado y form cuando se detecta un cliente existente
  useEffect(() => {
    if (!clienteExistente) return
    if (clienteIdVinculado === clienteExistente.id) return
    setClienteIdVinculado(clienteExistente.id)
    setForm(f => ({
      ...f,
      empresa:       clienteExistente.empresa   || f.empresa,
      email_cliente: clienteExistente.email     || f.email_cliente,
      telefono:      clienteExistente.telefono  || f.telefono,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteExistente])

  function handleClienteInput(val) {
    setField('cliente', val)
    setClienteIdVinculado(null)
    if (val.trim().length < 2) { setClienteSugs([]); setShowClienteDrop(false); return }
    const q = val.toLowerCase()
    const sugs = clientesBD.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.empresa || '').toLowerCase().includes(q) ||
      (c.email   || '').toLowerCase().includes(q)
    )
    setClienteSugs(sugs)
    setShowClienteDrop(true)
  }

  function seleccionarClienteBD(c) {
    setField('cliente',       c.nombre    || '')
    setField('empresa',       c.empresa   || '')
    setField('email_cliente', c.email     || '')
    setField('telefono',      c.telefono  || '')
    setClienteIdVinculado(c.id)
    setClienteSugs([])
    setShowClienteDrop(false)
  }

  async function crearClienteDesdeForm() {
    // Verificar duplicado antes de crear
    if (clienteExistente) {
      setClienteIdVinculado(clienteExistente.id)
      setModalCrearCliente(false)
      addToast('El cliente ya existe en la base de datos', 'info')
      return
    }
    setGuardandoCliente(true)
    try {
      const res = await clientesService.crear({
        nombre:   form.cliente,
        empresa:  form.empresa        || null,
        email:    form.email_cliente  || null,
        telefono: form.telefono       || null,
      })
      setClientesBD(p => [...p, res.data])
      setClienteIdVinculado(res.data.id)
      setModalCrearCliente(false)
      addToast('Cliente guardado en la base de datos', 'success')
    } catch {
      addToast('Error al crear el cliente', 'error')
    } finally {
      setGuardandoCliente(false)
    }
  }

  function validate() {
    const e = {}
    if (!form.cliente.trim())         e.cliente         = 'Requerido'
    if (!form.nombre_proyecto.trim()) e.nombre_proyecto = 'Requerido'
    if (items.every(i => !i.descripcion.trim())) e.items = 'Agrega al menos un ítem con descripción'
    if (ajusteActivo && ajusteTotal !== '' && !ajusteMotivo.trim()) e.ajuste_motivo = 'Debes indicar el motivo del ajuste'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function descargarPDF() {
    if (!editandoId) return
    try {
      const blob = await presupuestosService.descargarPDF(editandoId)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `presupuesto-${form.numero || editandoId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast('PDF descargado', 'success')
    } catch {
      addToast('Error al generar PDF', 'error')
    }
  }

  async function exportarExcel() {
    await exportarPresupuestoExcel({
      numero:           form.numero,
      cliente_nombre:   form.cliente,
      cliente_empresa:  form.empresa,
      cliente_email:    form.email_cliente,
      cliente_telefono: form.telefono,
      nombre_proyecto:  form.nombre_proyecto,
      tipo_proyecto:    form.tipo_proyecto,
      moneda:           form.moneda,
      fecha_emision:    form.fecha,
      validez_dias:     parseInt(form.validez) || 30,
      descuento:        parseFloat(form.descuento) || 0,
      impuesto:         ivaMonto,
      total:            totalFinal,
      ajuste_total:     ajusteActivo && ajusteTotal !== '' ? parseFloat(ajusteTotal) : null,
      ajuste_motivo:    ajusteMotivo || null,
      notas:            form.notas,
      items: items.map(i => ({
        categoria:                i.categoria,
        descripcion_personalizada: i.descripcion,
        cantidad:                 i.cantidad,
        precio_unitario:          i.precioUnitario,
        porcentaje_boleta:        i.porcentajeBoleta || 0,
        notas:                    i.notas,
      })),
    })
  }

  async function handleExcelTemplate() {
    if (!editandoId) return
    try {
      const res = await presupuestosService.excelDiff(editandoId)
      const { hasTemplate, diffs } = res.data
      if (!hasTemplate) { addToast('Template no encontrado en el servidor', 'error'); return }
      if (diffs.length === 0) await descargarExcelTemplate({})
      else setDiffModal({ diffs })
    } catch { addToast('Error al verificar el template', 'error') }
  }

  async function descargarExcelTemplate(opciones) {
    try {
      setExcelLoading(true)
      const blob = await presupuestosService.excelTemplate(editandoId, opciones)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `presupuesto-${form.numero || editandoId}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast('Excel generado correctamente', 'success')
      setDiffModal(null)
    } catch { addToast('Error al generar el Excel', 'error') }
    finally { setExcelLoading(false) }
  }

  async function guardar(estado = 'borrador') {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        estado,
        cliente_id: clienteIdVinculado || null,
        subtotal, descuento: parseFloat(form.descuento),
        impuesto: ivaMonto, total: totalFinal,
        ajuste_total:  ajusteActivo && ajusteTotal !== '' ? parseFloat(ajusteTotal) : null,
        ajuste_motivo: ajusteActivo && ajusteTotal !== '' ? ajusteMotivo : null,
        items: items.map(i => ({
          descripcion_personalizada: i.descripcion,
          categoria:          i.categoria,
          cantidad:           i.cantidad,
          precio_unitario:    i.precioUnitario,
          subtotal:           itemSubtotal(i),
          notas:              i.notas,
          fragmento_cliente:  i.fragmento_cliente || null,
          porcentaje_boleta:  i.porcentajeBoleta || 0,
        })),
      }
      if (editandoId) {
        await presupuestosService.actualizar(editandoId, payload)
        addToast('Presupuesto actualizado correctamente', 'success')
      } else {
        await presupuestosService.crear(payload)
        addToast('Presupuesto guardado correctamente', 'success')
      }
      navigate('/presupuestos')
    } catch (err) {
      addToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function limpiar() {
    setForm({
      cliente: '', empresa: '', email_cliente: '', telefono: '',
      nombre_proyecto: '', tipo_proyecto: '',
      numero: `ONY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      fecha: new Date().toISOString().split('T')[0],
      validez: '30', moneda: 'CLP', descuento: '0', iva: '19',
      notas: '', condiciones: DEFAULT_CONDITIONS,
    })
    setItems([makeItem()])
    setErrors({})
    setAjusteActivo(false)
    setAjusteTotal('')
    setAjusteMotivo('')
    setConfirmLimpiar(false)
  }

  if (loadingEdit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: TEXT_MUTED }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⟳</div>
          <div style={{ fontSize: 14 }}>Cargando presupuesto…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 600 }}>
            {editandoId ? 'Editar Presupuesto' : datosIA ? 'Presupuesto desde Análisis IA' : 'Nuevo Presupuesto'}
          </h1>
          <p style={{ margin: '6px 0 0', color: TEXT_MUTED, fontSize: 13 }}>
            N° <span style={{ color: GOLD }}>{form.numero}</span>
            {datosIA && <span style={{ marginLeft: 12, color: CYAN, fontSize: 11 }}>◎ Precargado desde IA</span>}
            {editandoId && <span style={{ marginLeft: 12, color: GOLD, fontSize: 11 }}>✎ Modo edición</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!editandoId && (
            <Button variant="danger" onClick={() => setConfirmLimpiar(true)}>↺ Limpiar</Button>
          )}
          <Button variant="secondary" onClick={() => setShowPreview(true)}>Vista Previa PDF</Button>
          <Button variant="secondary" onClick={exportarExcel}>↓ Excel</Button>
          {editandoId && (
            <Button variant="cyan" onClick={descargarPDF}>↓ Descargar PDF</Button>
          )}
          {editandoId && (
            <Button variant="cyan" onClick={handleExcelTemplate}>⊞ Excel Plantilla</Button>
          )}
          <Button onClick={() => guardar('borrador')} loading={saving}>Guardar</Button>
        </div>
      </div>

      {/* Client + Config grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card title="Datos del Cliente">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Nombre con autocomplete de clientes en BD */}
            <div style={{ position: 'relative' }}>
              <div style={{ marginBottom: 5, fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>Nombre *</div>
              <input
                value={form.cliente}
                onChange={e => handleClienteInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowClienteDrop(false), 150)}
                onFocus={() => form.cliente.length >= 2 && setShowClienteDrop(clienteSugs.length > 0)}
                placeholder="Nombre del cliente o buscar existente..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'transparent', border: `1px solid ${errors.cliente ? '#EF4444' : (clienteIdVinculado ? '#22C55E60' : BORDER)}`,
                  borderRadius: 6, padding: '8px 12px', color: TEXT, fontSize: 14,
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocusCapture={e => { e.target.style.borderColor = GOLD + '60' }}
              />
              {errors.cliente && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.cliente}</div>}

              {/* Dropdown de sugerencias */}
              {showClienteDrop && clienteSugs.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
                  boxShadow: '0 8px 24px #00000070', maxHeight: 220, overflowY: 'auto',
                  marginTop: 4,
                }}>
                  {clienteSugs.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => seleccionarClienteBD(c)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer',
                        borderBottom: `1px solid ${BORDER}30`,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = BG_SURFACE }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: `${GOLD}25`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, color: GOLD, fontWeight: 700,
                      }}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{c.nombre}</div>
                        {c.empresa && <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{c.empresa}</div>}
                      </div>
                      {c.email && <div style={{ color: TEXT_DIM, fontSize: 11, marginLeft: 'auto' }}>{c.email}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Banner: cliente encontrado en BD */}
            {form.cliente.trim().length >= 2 && (clienteExistente || clienteIdVinculado) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: '#22C55E10', border: '1px solid #22C55E40', borderRadius: 6,
              }}>
                <span style={{ color: '#22C55E', fontSize: 15 }}>✓</span>
                <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 600 }}>
                  Cliente registrado en base de datos
                </span>
              </div>
            )}

            {/* Banner: cliente nuevo — solo si NO existe en BD */}
            {form.cliente.trim().length >= 2 && !clienteExistente && !clienteIdVinculado && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: `${GOLD}08`, border: `1px solid ${GOLD}30`, borderRadius: 6,
              }}>
                <span style={{ color: TEXT_DIM, fontSize: 12, flex: 1 }}>
                  Cliente no registrado en BD
                </span>
                <button
                  onClick={() => setModalCrearCliente(true)}
                  style={{
                    background: `${GOLD}15`, border: `1px solid ${GOLD}50`,
                    color: GOLD, borderRadius: 5, padding: '4px 12px',
                    cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
                  }}
                >
                  + Guardar como cliente
                </button>
              </div>
            )}

            <Input label="Empresa"   value={form.empresa}       onChange={v => setField('empresa', v)} />
            <Input label="Email"     type="email" value={form.email_cliente} onChange={v => setField('email_cliente', v)} />
            <Input label="Teléfono"  value={form.telefono}      onChange={v => setField('telefono', v)} />
          </div>
        </Card>

        <Card title="Configuración del Presupuesto">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Nombre del Proyecto *" value={form.nombre_proyecto} onChange={v => setField('nombre_proyecto', v)} error={errors.nombre_proyecto} />
            <Select label="Tipo de Proyecto" value={form.tipo_proyecto} onChange={v => setField('tipo_proyecto', v)}
              options={[{ value: '', label: '— Seleccionar —' }, ...CATEGORIAS_SELECT]} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Fecha" type="date" value={form.fecha} onChange={v => setField('fecha', v)} />
              <Input label="Validez (días)" type="number" value={form.validez} onChange={v => setField('validez', v)} />
            </div>
            <Select label="Moneda" value={form.moneda} onChange={v => setField('moneda', v)} options={MONEDAS} />
          </div>
        </Card>
      </div>

      {/* Items */}
      <div style={{ background: BG_CARD, border: `1px solid ${errors.items ? '#EF4444' : BORDER}`, borderRadius: 10, marginBottom: 24 }}>
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Ítems del Presupuesto
            </div>
            {errors.items && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{errors.items}</div>}
          </div>
          <Button size="sm" variant="secondary" onClick={addItem}>+ Agregar ítem</Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                {[
                  { label: 'Categoría',      width: 180 },
                  { label: 'Nombre / Servicio' },
                  { label: 'Cant.',          width: 80  },
                  { label: 'Precio Unitario',width: 140 },
                  { label: '% Boleta',       width: 90  },
                  { label: 'Subtotal',       width: 130 },
                  { label: '',               width: 36  },
                ].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11,
                    color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontWeight: 600, borderBottom: `1px solid ${BORDER}`,
                    width: h.width || undefined,
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const opcionesNombre = servicios.filter(s => s.categoria === item.categoria)
                return (
                  <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? `1px solid ${BORDER}25` : 'none' }}>
                    {/* Categoría */}
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={item.categoria}
                        onChange={e => updateItem(item.id, 'categoria', e.target.value)}
                        style={{
                          background: BG_BASE, border: `1px solid ${BORDER}`,
                          borderRadius: 4, padding: '5px 8px',
                          color: TEXT_MUTED, fontSize: 12,
                          outline: 'none', fontFamily: 'inherit',
                          cursor: 'pointer', width: '100%',
                        }}
                      >
                        {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </td>

                    {/* Nombre — combobox desde catálogo */}
                    <td style={{ padding: '10px 14px' }}>
                      <ServiceCombobox
                        value={item.descripcion}
                        onChange={v => updateItem(item.id, 'descripcion', v)}
                        onSelectService={s => selectServicio(item.id, s)}
                        options={opcionesNombre}
                      />
                      {item.fragmento_cliente && (
                        <div style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: TEXT_DIM,
                          fontStyle: 'italic',
                          borderLeft: `2px solid ${GOLD}50`,
                          paddingLeft: 6,
                          lineHeight: 1.4,
                        }}>
                          "{item.fragmento_cliente}"
                        </div>
                      )}
                    </td>

                    {/* Cantidad */}
                    <td style={{ padding: '10px 14px' }}>
                      <input type="number" value={item.cantidad} min={1}
                        onChange={e => updateItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        style={{
                          background: BG_BASE, border: `1px solid ${BORDER}`,
                          borderRadius: 4, padding: '5px 8px',
                          color: TEXT, fontSize: 13, width: '100%',
                          outline: 'none', textAlign: 'center',
                        }}
                      />
                    </td>

                    {/* Precio unitario */}
                    <td style={{ padding: '10px 14px' }}>
                      <input type="number" value={item.precioUnitario} min={0}
                        onChange={e => updateItem(item.id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        style={{
                          background: BG_BASE, border: `1px solid ${BORDER}`,
                          borderRadius: 4, padding: '5px 8px',
                          color: TEXT, fontSize: 13, width: '100%',
                          outline: 'none', textAlign: 'right',
                        }}
                      />
                    </td>

                    {/* % Boleta */}
                    <td style={{ padding: '10px 14px' }}>
                      <input type="number" value={item.porcentajeBoleta} min={0} max={100}
                        onChange={e => updateItem(item.id, 'porcentajeBoleta', parseFloat(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        style={{
                          background: BG_BASE, border: `1px solid ${BORDER}`,
                          borderRadius: 4, padding: '5px 8px',
                          color: TEXT, fontSize: 13, width: '100%',
                          outline: 'none', textAlign: 'right',
                        }}
                      />
                    </td>

                    {/* Subtotal */}
                    <td style={{
                      padding: '10px 14px', fontSize: 14, color: TEXT,
                      fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {fmt(itemSubtotal(item))}
                    </td>

                    {/* Eliminar */}
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
                        onMouseEnter={e => e.target.style.color = '#EF4444'}
                        onMouseLeave={e => e.target.style.color = TEXT_DIM}
                      >×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: TEXT_DIM, fontSize: 13 }}>
            Agrega ítems con el botón de arriba
          </div>
        )}
      </div>

      {/* Notes + Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <Card title="Notas y Condiciones Comerciales">
          <Textarea label="Notas para el cliente" value={form.notas} onChange={v => setField('notas', v)} placeholder="Notas adicionales..." rows={3} />
          <div style={{ marginTop: 14 }}>
            <Textarea label="Condiciones comerciales" value={form.condiciones} onChange={v => setField('condiciones', v)} rows={7} style={{ fontSize: 11, lineHeight: 1.6 }} />
          </div>
        </Card>

        <div style={{ background: BG_CARD, border: `1px solid ${GOLD}30`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 18 }}>
            Resumen Financiero
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TotalRow label="Subtotal" value={fmt(subtotal)} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED, flex: 1 }}>Descuento (%)</span>
              <input type="number" value={form.descuento} min={0} max={100}
                onChange={e => setField('descuento', e.target.value)}
                onFocus={e => e.target.select()}
                style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '5px 8px', color: TEXT, fontSize: 12, width: 60, outline: 'none', textAlign: 'right' }}
              />
            </div>

            {parseFloat(form.descuento) > 0 && (
              <TotalRow label={`Descuento (${form.descuento}%)`} value={`- ${fmt(descuentoMonto)}`} color="#EF4444" />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED, flex: 1 }}>IVA (%)</span>
              <input type="number" value={form.iva} min={0} max={100}
                onChange={e => setField('iva', e.target.value)}
                onFocus={e => e.target.select()}
                style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '5px 8px', color: TEXT, fontSize: 12, width: 60, outline: 'none', textAlign: 'right' }}
              />
            </div>

            <TotalRow label={`IVA (${form.iva}%)`} value={fmt(ivaMonto)} />

            <div style={{ borderTop: `1px solid ${GOLD}30`, paddingTop: 14, marginTop: 4 }}>
              {ajusteActivo
                ? <TotalRow label="Neto calculado" value={fmt(netoCal)} color={TEXT_DIM} />
                : <TotalRow label="TOTAL" value={fmt(totalFinal)} large gold />
              }
            </div>

            {/* Ajuste manual de total */}
            <div style={{
              border: `1px solid ${ajusteActivo ? GOLD + '50' : BORDER}`,
              borderRadius: 8, padding: '12px 14px',
              background: ajusteActivo ? `${GOLD}06` : 'transparent',
              marginTop: 4,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={ajusteActivo}
                  onChange={e => {
                    setAjusteActivo(e.target.checked)
                    if (!e.target.checked) { setAjusteTotal(''); setAjusteMotivo('') }
                    else setAjusteTotal(String(Math.round(netoCal)))
                  }}
                  style={{ accentColor: GOLD, width: 14, height: 14 }}
                />
                <span style={{ fontSize: 12, color: ajusteActivo ? GOLD : TEXT_MUTED, fontWeight: 600 }}>
                  Ajustar total manualmente
                </span>
              </label>

              {ajusteActivo && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Neto ajustado — antes de IVA ({form.moneda})</div>
                    <input
                      type="number"
                      value={ajusteTotal}
                      onChange={e => setAjusteTotal(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: BG_BASE, border: `1px solid ${GOLD}50`,
                        borderRadius: 5, padding: '7px 10px',
                        color: GOLD, fontSize: 16, fontWeight: 700,
                        outline: 'none', textAlign: 'right',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
                      Motivo del ajuste *
                    </div>
                    <textarea
                      value={ajusteMotivo}
                      onChange={e => setAjusteMotivo(e.target.value)}
                      placeholder="Ej: Descuento especial por volumen, ajuste pactado con el cliente..."
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box', resize: 'vertical',
                        background: BG_BASE,
                        border: `1px solid ${errors.ajuste_motivo ? '#EF4444' : BORDER}`,
                        borderRadius: 5, padding: '7px 10px',
                        color: TEXT, fontSize: 12, lineHeight: 1.5,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    {errors.ajuste_motivo && (
                      <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{errors.ajuste_motivo}</div>
                    )}
                  </div>
                  <div style={{ borderTop: `1px solid ${GOLD}30`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <TotalRow label={`IVA (${form.iva}%)`} value={fmt(ivaMonto)} />
                    <TotalRow label="TOTAL AJUSTADO" value={fmt(totalFinal)} large gold />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button onClick={() => guardar('borrador')} loading={saving} style={{ width: '100%', justifyContent: 'center' }}>
              Guardar como Borrador
            </Button>
            <Button variant="cyan" onClick={() => guardar('enviado')} style={{ width: '100%', justifyContent: 'center' }}>
              Guardar y Marcar Enviado
            </Button>
          </div>
        </div>
      </div>

      {diffModal && (
        <ExcelDiffModal
          diffs={diffModal.diffs}
          loading={excelLoading}
          onConfirm={(opciones) => descargarExcelTemplate(opciones)}
          onCancel={() => setDiffModal(null)}
        />
      )}

      {showPreview && (
        <Modal title="Vista Previa — PDF" onClose={() => setShowPreview(false)} width={720}>
          <PDFPreview form={form} items={items} />
        </Modal>
      )}

      {confirmLimpiar && (
        <ConfirmDialog
          title="Limpiar formulario"
          message="Se borrarán todos los datos ingresados y los ítems del presupuesto. ¿Deseas continuar?"
          confirmLabel="Sí, limpiar"
          danger
          onConfirm={limpiar}
          onCancel={() => setConfirmLimpiar(false)}
        />
      )}

      {modalCrearCliente && (
        <Modal title="Guardar como Cliente" onClose={() => setModalCrearCliente(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
              Se guardará el siguiente cliente en la base de datos. Podrás editar sus datos más tarde en la sección <strong>Clientes</strong>.
            </p>
            <div style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{form.cliente}</div>
              {form.empresa && <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{form.empresa}</div>}
              {form.email_cliente && <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{form.email_cliente}</div>}
              {form.telefono && <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{form.telefono}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <Button onClick={crearClienteDesdeForm} loading={guardandoCliente} style={{ flex: 1, justifyContent: 'center' }}>
                Guardar Cliente
              </Button>
              <Button variant="secondary" onClick={() => setModalCrearCliente(false)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  )
}

function TotalRow({ label, value, color, large, gold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: large ? 14 : 12, color: gold ? GOLD : TEXT_MUTED, fontWeight: large ? 700 : 400 }}>{label}</span>
      <span style={{
        fontSize: large ? 20 : 13,
        color: color || (gold ? GOLD : TEXT),
        fontWeight: large ? 700 : 500,
      }}>{value}</span>
    </div>
  )
}
