const router = require('express').Router()
const ctrl   = require('../controllers/ia.controller')
const { iaLimiter } = require('../middleware/rateLimiter')

router.post('/analizar', iaLimiter, ctrl.analizar)

module.exports = router
