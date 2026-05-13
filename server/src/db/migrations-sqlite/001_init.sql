-- ============================================================
--  ONYRIA STUDIO — Esquema SQLite (instalación local)
--  Equivalente al schema PostgreSQL pero adaptado:
--    UUID → TEXT (generado vía uuid_generate_v4() custom function)
--    NUMERIC → REAL
--    BOOLEAN → INTEGER (0/1)
--    TIMESTAMP → TEXT (ISO 8601)
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id            TEXT    PRIMARY KEY DEFAULT (uuid_generate_v4()),
  email         TEXT    NOT NULL UNIQUE,
  nombre        TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  rol           TEXT    NOT NULL DEFAULT 'usuario',
  activo        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS servicios (
  id                TEXT    PRIMARY KEY DEFAULT (uuid_generate_v4()),
  nombre            TEXT    NOT NULL,
  categoria         TEXT    NOT NULL,
  subcategoria      TEXT,
  descripcion       TEXT,
  precio_base       REAL    NOT NULL DEFAULT 0,
  porcentaje_boleta REAL    NOT NULL DEFAULT 0,
  unidad            TEXT    NOT NULL DEFAULT 'por pieza',
  moneda            TEXT    NOT NULL DEFAULT 'CLP',
  activo            INTEGER NOT NULL DEFAULT 1,
  aliases           TEXT,   -- JSON array de aliases para búsqueda
  tags              TEXT,   -- JSON array de tags
  embedding         TEXT,   -- JSON array de floats (preparado para embeddings locales)
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON servicios(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_activo    ON servicios(activo);

CREATE TABLE IF NOT EXISTS clientes (
  id         TEXT    PRIMARY KEY DEFAULT (uuid_generate_v4()),
  nombre     TEXT    NOT NULL,
  empresa    TEXT,
  email      TEXT,
  telefono   TEXT,
  rut        TEXT,
  notas      TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clientes_email  ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

CREATE TABLE IF NOT EXISTS presupuestos (
  id                TEXT    PRIMARY KEY DEFAULT (uuid_generate_v4()),
  numero            TEXT    NOT NULL UNIQUE,
  cliente_id        TEXT    REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre    TEXT,
  cliente_empresa   TEXT,
  cliente_email     TEXT,
  cliente_telefono  TEXT,
  nombre_proyecto   TEXT    NOT NULL,
  tipo_proyecto     TEXT,
  moneda            TEXT    NOT NULL DEFAULT 'CLP',
  subtotal          REAL    NOT NULL DEFAULT 0,
  descuento         REAL    NOT NULL DEFAULT 0,
  impuesto          REAL    NOT NULL DEFAULT 0,
  total             REAL    NOT NULL DEFAULT 0,
  ajuste_total      REAL,
  ajuste_motivo     TEXT,
  estado            TEXT    NOT NULL DEFAULT 'borrador',
  validez_dias      INTEGER NOT NULL DEFAULT 30,
  fecha_emision     TEXT    NOT NULL DEFAULT (date('now')),
  notas             TEXT,
  condiciones       TEXT,
  creado_por        TEXT    REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado    ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente   ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_creado_at ON presupuestos(created_at);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id                         TEXT    PRIMARY KEY DEFAULT (uuid_generate_v4()),
  presupuesto_id             TEXT    NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  servicio_id                TEXT    REFERENCES servicios(id) ON DELETE SET NULL,
  descripcion_personalizada  TEXT,
  categoria                  TEXT,
  cantidad                   REAL    NOT NULL DEFAULT 1,
  precio_unitario            REAL    NOT NULL DEFAULT 0,
  subtotal                   REAL    NOT NULL DEFAULT 0,
  porcentaje_boleta          REAL    NOT NULL DEFAULT 0,
  notas                      TEXT,
  fragmento_cliente          TEXT,
  orden                      INTEGER NOT NULL DEFAULT 0,
  created_at                 TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_presupuesto ON presupuesto_items(presupuesto_id);

CREATE TABLE IF NOT EXISTS configuracion (
  clave      TEXT PRIMARY KEY,
  valor      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabla preparada para futuro feedback de IA (no se usa todavía)
CREATE TABLE IF NOT EXISTS service_feedback (
  id                  TEXT PRIMARY KEY DEFAULT (uuid_generate_v4()),
  texto_original      TEXT NOT NULL,
  servicio_detectado  TEXT REFERENCES servicios(id) ON DELETE SET NULL,
  servicio_confirmado TEXT REFERENCES servicios(id) ON DELETE SET NULL,
  usuario_corrigio    INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
