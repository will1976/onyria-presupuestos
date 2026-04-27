import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar }        from './components/layout/Sidebar'
import { ToastContainer } from './components/ui/Toast'
import { useToast }       from './hooks/useToast'
import { BG_BASE }        from './components/theme'

import Dashboard        from './pages/Dashboard'
import AnalisisIA       from './pages/AnalisisIA'
import NuevoPresupuesto from './pages/NuevoPresupuesto'
import Presupuestos     from './pages/Presupuestos'
import Servicios        from './pages/Servicios'
import Clientes         from './pages/Clientes'
import Ayuda           from './pages/Ayuda'

function AppShell() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { toasts, addToast, removeToast } = useToast()
  const [datosIA,    setDatosIA]    = useState(null)
  const [editandoId, setEditandoId] = useState(null)

  const activeTab = location.pathname.replace('/', '') || 'dashboard'

  function navTo(page) {
    if (page !== 'nuevo' && page !== 'editar') { setDatosIA(null); setEditandoId(null) }
    navigate(`/${page}`)
  }

  function handlePresupuestoDesdeIA(datos) {
    setDatosIA(datos)
    setEditandoId(null)
    navigate('/nuevo')
  }

  function handleEditar(id) {
    setEditandoId(id)
    setDatosIA(null)
    navigate('/editar')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: BG_BASE }}>
      <Sidebar active={activeTab} onNav={navTo} />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/"             element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<Dashboard onNav={navTo} />} />
          <Route path="/analisis"     element={<AnalisisIA onPresupuestoGenerado={handlePresupuestoDesdeIA} addToast={addToast} />} />
          <Route path="/nuevo"        element={<NuevoPresupuesto datosIA={datosIA} addToast={addToast} />} />
          <Route path="/editar"       element={<NuevoPresupuesto key={editandoId} editandoId={editandoId} addToast={addToast} />} />
          <Route path="/presupuestos" element={<Presupuestos addToast={addToast} onNuevo={() => navTo('nuevo')} onEditar={handleEditar} />} />
          <Route path="/clientes"     element={<Clientes addToast={addToast} />} />
          <Route path="/servicios"    element={<Servicios addToast={addToast} />} />
          <Route path="/ayuda"        element={<Ayuda />} />
        </Routes>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}
