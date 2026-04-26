const router = require('express').Router()
const ctrl   = require('../controllers/auth.controller')
const auth   = require('../middleware/auth.middleware')
const { authLimiter } = require('../middleware/rateLimiter')

router.post('/login',           authLimiter, ctrl.login)
router.post('/logout',          auth,        ctrl.logout)
router.get ('/me',              auth,        ctrl.me)
router.put ('/change-password', auth,        ctrl.changePassword)

module.exports = router
