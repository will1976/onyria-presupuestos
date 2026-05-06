import { useState, useEffect } from 'react'
import { exportarPresupuestoExcel } from '../utils/exportPresupuesto'
import { Badge, Button, ActionBtn, Spinner } from '../components/ui'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ExcelDiffModal } from '../components/ui/ExcelDiffModal'
import { usePresupuestos } from '../hooks/usePresupuestos'
import { presupuestosService } from '../services/presupuestos.service'
import { clientesService } from '../services/clientes.service'
import {
  GOLD, CYAN, BG_CARD, BG_SURFACE, BG_HOVER, BORDER,
  TEXT, TEXT_MUTED, TEXT_DIM, ESTADOS, formatMonto,
} from '../components/theme'

export default function Presupuestos({ addToast, onNuevo, onEditar }) {
  const [estadoFiltro,  setEstadoFiltro]  = useState('todos')
  const [busqueda,      setBusqueda]      = useState('')
  const [clienteFiltro, setClienteFiltro] = useState(null) // { id, nombre }
  const [clientes,      setClientes]      = useState([])
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClientePicker, setShowClientePicker] = useState(false)
  const [confirm,       setConfirm]       = useState(null)
  const [diffModal,     setDiffModal]     = useState(null)  // { id, numero, diffs }
  const [excelLoading,  setExcelLoading]  = useState(false)

  const { presupuestos, loading, error, refetch, cambiarEstado, eliminar } = usePresupuestos()

  useEffect(() => {
    clientesService.listar()
      .then(res => setClientes(res.data || []))
      .catch(() => {})
  }, [])

  const clientesFiltrados = clientes.filter(c => {
    if (!clienteSearch) return true
    const q = clienteSearch.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || (c.empresa || '').toLowerCase().includes(q)
  })

  const filtered = presupuestos.filter(p => {
    if (estadoFiltro !== 'todos' && p.estado !== estadoFiltro) return false
    if (clienteFiltro) {
      const nombre = (p.cliente || p.cliente_nombre || '').toLowerCase()
      if (!nombre.includes(clienteFiltro.nombre.toLowerCase())) return false
    }
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        p.numero?.toLowerCase().includes(q) ||
        (p.cliente || p.cliente_nombre || '').toLowerCase().includes(q) ||
        p.nombre_proyecto?.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function handleCambiarEstado(id, estado) {
    try {
      await cambiarEstado(id, estado)
      addToast(`Estado actualizado: ${ESTADOS[estado].label}`, 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleEliminar() {
    try {
      await eliminar(confirm.id)
      addToast('Presupuesto eliminado', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  async function handleExportarExcel(id) {
    try {
      const res = await presupuestosService.obtener(id)
      await exportarPresupuestoExcel(res.data)
      addToast('Excel exportado correctamente', 'success')
    } catch {
      addToast('Error al exportar Excel', 'error')
    }
  }

  async function handleDuplicar(id) {
    try {
      await presupuestosService.duplicar(id)
      await refetch()
      addToast('Presupuesto duplicado', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleExcelTemplate(id, numero) {
    try {
      const res = await presupuestosService.excelDiff(id)
      const { hasTemplate, diffs } = res.data.data

      if (!hasTemplate) {
        addToast('Template no encontrado en el servidor (server/templates/presupuesto-template.xlsx)', 'error')
        return
      }

      if (diffs.length === 0) {
        // Sin diferencias → generar directamente
        await descargarExcelTemplate(id, numero, {})
      } else {
        setDiffModal({ id, numero, diffs })
      }
    } catch {
      addToast('Error al verificar el template', 'error')
    }
  }

  async function descargarExcelTemplate(id, numero, opciones) {
    try {
      setExcelLoading(true)
      const blob = await presupuestosService.excelTemplate(id, opciones)
      const url  = URL.createObjectURL(blob.data)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `presupuesto-${numero || id}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast('Excel generado correctamente', 'success')
      setDiffModal(null)
    } catch {
      addToast('Error al generar el Excel', 'error')
    } finally {
      setExcelLoading(false)
    }
  }

  async function handleDescargarPDF(id, numero) {
    try {
      const blob = await presupuestosService.descargarPDF(id)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `presupuesto-${numero || id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast('PDF descargado', 'success')
    } catch (err) {
      addToast('Error al generar PDF', 'error')
    }
  }

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 600 }}>Presupuestos</h1>
          <p style={{ margin: '6px 0 0', color: TEXT_MUTED, fontSize: 13 }}>
            {filtered.length} de {presupuestos.length} registros
            {clienteFiltro && (
              <span style={{ marginLeft: 8, color: GOLD, fontWeight: 600 }}>
                · cliente: {clienteFiltro.nombre}
              </span>
            )}
          </p>
        </div>
        <Button onClick={onNuevo}>⊕ Nuevo Presupuesto</Button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>

        {/* Fila 1: búsqueda + filtro cliente */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, número o proyecto..."
            style={{
              flex: 1, minWidth: 200, background: BG_CARD, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: '9px 14px', color: TEXT, fontSize: 13,
              outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={e => { e.target.style.borderColor = GOLD + '60' }}
            onBlur={e => { e.target.style.borderColor = BORDER }}
          />

          {/* Selector de cliente */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowClientePicker(p => !p)}
              style={{
                background: clienteFiltro ? `${GOLD}15` : BG_CARD,
                border: `1px solid ${clienteFiltro ? GOLD + '60' : BORDER}`,
                borderRadius: 6, padding: '9px 14px', color: clienteFiltro ? GOLD : TEXT_MUTED,
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              }}
            >
              <span>◉</span>
              {clienteFiltro ? clienteFiltro.nombre : 'Filtrar por cliente'}
              {clienteFiltro && (
                <span
                  title="Quitar filtro"
                  onClick={e => { e.stopPropagation(); setClienteFiltro(null); setClienteSearch('') }}
                  style={{ color: TEXT_DIM, marginLeft: 2 }}
                >✕</span>
              )}
            </button>

            {showClientePicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: 4,
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
                boxShadow: '0 8px 24px #00000070', width: 280,
              }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}>
                  <input
                    autoFocus
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: BG_SURFACE, border: `1px solid ${BORDER}`,
                      borderRadius: 5, padding: '7px 10px', color: TEXT,
                      fontSize: 13, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {clientesFiltrados.length === 0 ? (
                    <div style={{ padding: '12px 14px', color: TEXT_DIM, fontSize: 13 }}>Sin resultados</div>
                  ) : clientesFiltrados.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setClienteFiltro(c); setShowClientePicker(false); setClienteSearch('') }}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', transition: 'background 0.1s',
                        borderBottom: `1px solid ${BORDER}20`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = BG_HOVER }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{c.nombre}</div>
                      {c.empresa && <div style={{ color: TEXT_DIM, fontSize: 11 }}>{c.empresa}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fila 2: filtros de estado */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['todos', ...Object.keys(ESTADOS)].map(estado => {
            const isActive = estadoFiltro === estado
            const s        = ESTADOS[estado]
            return (
              <button key={estado} onClick={() => setEstadoFiltro(estado)} style={{
                background: isActive ? (s ? s.bg : `${GOLD}15`) : 'transparent',
                color:      isActive ? (s ? s.color : GOLD) : TEXT_DIM,
                border:     `1px solid ${isActive ? (s ? s.color + '50' : GOLD + '50') : BORDER}`,
                borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {estado === 'todos' ? 'Todos' : s?.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={28} /></div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#EF4444', fontSize: 14 }}>{error}</div>
      ) : (
        <div
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}
          onClick={() => showClientePicker && setShowClientePicker(false)}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['N° Presupuesto', 'Cliente', 'Proyecto', 'Monto', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 10,
                    color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontWeight: 600, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}30` : 'none', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = BG_HOVER}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 16px', fontSize: 12, color: GOLD, fontWeight: 600, whiteSpace: 'nowrap' }}>{p.numero}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: TEXT }}>
                    <div>{p.cliente || p.cliente_nombre}</div>
                    {p.cliente_empresa && (
                      <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 1 }}>{p.cliente_empresa}</div>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: TEXT_MUTED, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nombre_proyecto}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 14, color: TEXT, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatMonto(p.total, p.moneda)}
                  </td>
                  <td style={{ padding: '13px 16px' }}><Badge estado={p.estado} /></td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>
                    {p.created_at?.split('T')[0] || p.fecha}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <ActionBtn title="Editar"             color={GOLD}    onClick={() => onEditar(p.id)}>✎</ActionBtn>
                      <ActionBtn title="Marcar Aceptado"    color="#22C55E" onClick={() => handleCambiarEstado(p.id, 'aceptado')}>✓</ActionBtn>
                      <ActionBtn title="Marcar Enviado"     color={CYAN}    onClick={() => handleCambiarEstado(p.id, 'enviado')}>↑</ActionBtn>
                      <ActionBtn title="Marcar Rechazado"   color="#EF4444" onClick={() => handleCambiarEstado(p.id, 'rechazado')}>✕</ActionBtn>
                      <ActionBtn title="Duplicar"           color={GOLD}    onClick={() => handleDuplicar(p.id)}>⎘</ActionBtn>
                      <ActionBtn title="Descargar PDF"      color={GOLD}    onClick={() => handleDescargarPDF(p.id, p.numero)}>↓</ActionBtn>
                      <ActionBtn title="Exportar Excel (libre)"   color="#22C55E" onClick={() => handleExportarExcel(p.id)}>⬇</ActionBtn>
                      <ActionBtn title="Exportar Excel (plantilla)" color={CYAN} onClick={() => handleExcelTemplate(p.id, p.numero)}>⊞</ActionBtn>
                      <ActionBtn title="Eliminar"           color="#EF4444" onClick={() => setConfirm({ id: p.id, numero: p.numero })}>🗑</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: 56, textAlign: 'center', color: TEXT_DIM, fontSize: 13 }}>
              {clienteFiltro
                ? `No hay presupuestos para el cliente "${clienteFiltro.nombre}"`
                : 'No se encontraron presupuestos con los filtros actuales'}
            </div>
          )}
        </div>
      )}

      {diffModal && (
        <ExcelDiffModal
          diffs={diffModal.diffs}
          loading={excelLoading}
          onConfirm={(opciones) => descargarExcelTemplate(diffModal.id, diffModal.numero, opciones)}
          onCancel={() => setDiffModal(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Eliminar Presupuesto"
          message={`¿Estás seguro de que deseas eliminar el presupuesto ${confirm.numero}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={handleEliminar}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
