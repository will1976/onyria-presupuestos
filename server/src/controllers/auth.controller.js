const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const config = require('../config')
const { query } = require('../db')

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' })
    }

    const { rows } = await query(
      'SELECT id, nombre, email, password_hash, activo FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    const user = rows[0]
    if (!user || !user.activo) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, nombre: user.nombre, email: user.email },
      },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout  (client just drops token — this is a no-op)
async function logout(req, res) {
  res.json({ success: true, data: { message: 'Sesión cerrada' } })
}

// GET /api/auth/me
async function me(req, res) {
  res.json({
    success: true,
    data: { user: req.user },
  })
}

// POST /api/auth/change-password
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Campos requeridos' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' })
    }

    const { rows } = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id])
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Contraseña actual incorrecta' })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, req.user.id])

    res.json({ success: true, data: { message: 'Contraseña actualizada' } })
  } catch (err) {
    next(err)
  }
}

module.exports = { login, logout, me, changePassword }
