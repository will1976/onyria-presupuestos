/**
 * Punto de entrada único para los repositorios.
 *
 * Cada repositorio es un singleton (una sola instancia compartida) porque
 * SQLite con better-sqlite3 mantiene una única conexión global.
 *
 * Uso:
 *   const { serviciosRepo } = require('./repositories')
 *   const items = serviciosRepo.listarActivos()
 */

const { serviciosRepo,    ServiciosRepository    } = require('./servicios.repo')
const { clientesRepo,     ClientesRepository     } = require('./clientes.repo')
const { presupuestosRepo, PresupuestosRepository } = require('./presupuestos.repo')

module.exports = {
  serviciosRepo,
  clientesRepo,
  presupuestosRepo,
  // Clases exportadas para tests o sub-clasificación
  ServiciosRepository,
  ClientesRepository,
  PresupuestosRepository,
}
