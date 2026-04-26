import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'
import { GOLD, GOLD_LIGHT, BG_BASE, BG_CARD, BORDER, TEXT, TEXT_MUTED, TEXT_DIM, CYAN } from '../components/theme'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', background: BG_BASE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%', width: 400, height: 400,
        background: `radial-gradient(circle, ${GOLD}08 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300,
        background: `radial-gradient(circle, ${CYAN}06 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: BG_CARD, border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: '48px 40px', width: 400,
        boxShadow: `0 24px 64px #00000080, 0 0 0 1px ${GOLD}10`,
        animation: 'scaleIn 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/logo.png"
            alt="Onyria Studio"
            style={{ height: 90, width: 'auto', borderRadius: 10, margin: '0 auto 14px', display: 'block' }}
          />
          <div style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Sistema de Presupuestos
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input
            label="Correo Electrónico"
            type="email"
            value={form.email}
            onChange={v => setForm(f => ({ ...f, email: v }))}
            placeholder="tu@onyria.cl"
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={v => setForm(f => ({ ...f, password: v }))}
            placeholder="••••••••"
          />

          {error && (
            <div style={{
              background: '#EF444415', border: '1px solid #EF444430',
              borderRadius: 6, padding: '10px 14px',
              color: '#EF4444', fontSize: 13,
            }}>{error}</div>
          )}

          <Button type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            Iniciar sesión
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: TEXT_DIM }}>
          Acceso exclusivo para el equipo de Onyria Studio
        </div>
      </div>
    </div>
  )
}
