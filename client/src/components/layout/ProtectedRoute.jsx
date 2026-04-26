import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui'
import { BG_BASE, GOLD } from '../theme'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: BG_BASE, flexDirection: 'column', gap: 16,
      }}>
        <Spinner size={32} color={GOLD} />
        <span style={{ color: '#4A4858', fontSize: 13 }}>Cargando...</span>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}
