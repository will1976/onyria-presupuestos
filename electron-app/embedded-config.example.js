/**
 * electron-app/embedded-config.example.js
 *
 * Template. Copia este archivo como `embedded-config.js` (en el mismo
 * directorio) y rellena con tus claves de producción ANTES de hacer
 * `npm run dist`. El archivo real está en .gitignore y NO se sube al repo,
 * pero SÍ queda embebido en el asar del .exe que distribuyes al cliente.
 *
 * Si no creas embedded-config.js, la app arranca igual pero la IA quedará
 * sin GROQ_API_KEY y no funcionará.
 */
'use strict'

module.exports = {
  JWT_SECRET:      'REEMPLAZA_CON_UN_SECRETO_LARGO_Y_ALEATORIO',
  JWT_EXPIRES_IN:  '7d',
  GROQ_API_KEY:    'gsk_TU_KEY_DE_GROQ',
  GROQ_MODEL:      'llama-3.3-70b-versatile',
  COMPANY_NAME:    'Onyria Studio',
  COMPANY_EMAIL:   'contacto@onyria.cl',
  COMPANY_PHONE:   '+56 2 2345 6789',
  COMPANY_ADDRESS: 'Santiago, Chile',
}
