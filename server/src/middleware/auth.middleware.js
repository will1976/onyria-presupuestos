const jwt    = require('jsonwebtoken')
const config = require('../config')
const { query } = require('../db')

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token no proporcionado' })
    }

    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, config.jwt.secret)

    // Fetch fresh user from DB to ensure they're still active
    const { rows } = await query(
      'SELECT id, nombre, email, activo FROM usuarios WHERE id = $1',
      [decoded.sub]
    )

    if (!rows[0] || !rows[0].activo) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado o inactivo' })
    }

    req.user = rows[0]
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' })
    }
    return res.status(401).json({ success: false, error: 'Token inválido' })
  }
}

module.exports = authMiddleware
