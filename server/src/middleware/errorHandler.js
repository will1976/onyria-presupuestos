function errorHandler(err, req, res, next) {
  // Log with context
  console.error(`[error] ${req.method} ${req.path}: code=${err.code} msg=${err.message}`)
  console.error(err.stack)

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Ya existe un registro con esos datos',
    })
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referencia a registro inexistente',
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
    })
  }

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      error: err.message,
      details: err.details,
    })
  }

  const status  = err.statusCode || err.status || 500
  const message = (status < 500) ? err.message : 'Error interno del servidor'

  res.status(status).json({ success: false, error: message })
}

module.exports = errorHandler
