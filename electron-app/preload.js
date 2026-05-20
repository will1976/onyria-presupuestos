/**
 * Preload script — Onyria Studio Presupuestos.
 *
 * Por ahora la app no necesita exponer APIs nativas al renderer. Este script
 * existe principalmente para mantener contextIsolation y como punto de
 * extensión futuro (ej: para mostrar la versión, abrir Logs, etc.).
 */

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('onyria', {
  version: process.env.npm_package_version || '1.0.0',
  platform: process.platform,
})
