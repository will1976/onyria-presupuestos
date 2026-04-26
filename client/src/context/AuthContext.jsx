import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('onyria_token')
    if (!token) { setLoading(false); return }

    authService.me()
      .then(res => setUser(res.data.user))
      .catch(() => localStorage.removeItem('onyria_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password)
    localStorage.setItem('onyria_token', res.data.token)
    setUser(res.data.user)
    return res
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('onyria_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
