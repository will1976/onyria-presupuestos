const router = require('express').Router()
const ctrl   = require('../controllers/clientes.controller')

router.get ('/',                    ctrl.listar)
router.get ('/:id',                 ctrl.obtener)
router.get ('/:id/presupuestos',    ctrl.presupuestosPorCliente)
router.post('/',                    ctrl.crear)
router.put ('/:id',                 ctrl.actualizar)
router.delete('/:id',              ctrl.eliminar)

module.exports = router
