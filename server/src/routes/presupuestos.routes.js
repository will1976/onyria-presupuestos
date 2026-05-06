const router = require('express').Router()
const ctrl   = require('../controllers/presupuestos.controller')

router.get   ('/',              ctrl.listar)
router.get   ('/metricas',      ctrl.metricas)       // ← before /:id
router.get   ('/:id',           ctrl.obtener)
router.post  ('/',              ctrl.crear)
router.put   ('/:id',           ctrl.actualizar)
router.patch ('/:id/estado',    ctrl.cambiarEstado)
router.delete('/:id',           ctrl.eliminar)
router.post  ('/:id/duplicar',  ctrl.duplicar)
router.get   ('/:id/pdf',             ctrl.pdf)
router.get   ('/:id/excel-diff',      ctrl.excelDiff)
router.post  ('/:id/excel-template',  ctrl.excelTemplate)

module.exports = router
