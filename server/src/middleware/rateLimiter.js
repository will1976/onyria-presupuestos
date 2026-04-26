const rateLimit = require('express-rate-limit')

// General API limiter
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, error: 'Demasiadas solicitudes, intenta más tarde.' },
})

// Strict limiter for IA endpoint (Gemini calls are expensive)
const iaLimiter = rateLimit({
  windowMs:         60 * 60 * 1000, // 1 hour
  max:              30,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, error: 'Límite de análisis IA alcanzado. Intenta en una hora.' },
})

// Auth limiter to prevent brute force
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, error: 'Demasiados intentos de login. Espera 15 minutos.' },
})

module.exports = { apiLimiter, iaLimiter, authLimiter }
