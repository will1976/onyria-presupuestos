-- ============================================================
--  ONYRIA STUDIO — Esquema inicial PostgreSQL
--  Ejecutar con: npm run db:migrate (desde /server)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enum: categoría de servicio ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE categoria_servicio AS ENUM (
    'postproduccion_publicitaria',
    'diseno_sonoro',
    'mezcla_ficcion',
    'localizacion_doblaje',
    'atmos',
    'audio_interactivo',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enum: moneda ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE moneda_tipo AS ENUM ('CLP', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enum: estado presupuesto ──────────────────────────────────
DO $$ BEGIN
  CREATE TYPE estado_presupuesto AS ENUM (
    'borrador',
    'enviado',
    'aceptado',
    'rechazado',
    'expirado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Usuarios ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Catálogo de servicios ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  id            UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(200)       NOT NULL,
  categoria     categoria_servicio NOT NULL DEFAULT 'otro',
  descripcion   TEXT,
  precio_base   NUMERIC(14, 2)     NOT NULL DEFAULT 0,
  unidad        VARCHAR(80)        NOT NULL DEFAULT 'por pieza',
  moneda        moneda_tipo        NOT NULL DEFAULT 'CLP',
  activo        BOOLEAN            NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── Clientes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(200) NOT NULL,
  empresa       VARCHAR(200),
  email         VARCHAR(200),
  telefono      VARCHAR(60),
  notas         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Presupuestos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuestos (
  id              UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          VARCHAR(40)        NOT NULL UNIQUE,
  cliente_id      UUID               REFERENCES clientes(id) ON DELETE SET NULL,
  -- Snapshot of client data (in case client record changes)
  cliente_nombre  VARCHAR(200),
  cliente_empresa VARCHAR(200),
  cliente_email   VARCHAR(200),
  cliente_telefono VARCHAR(60),
  -- Project
  nombre_proyecto VARCHAR(300)       NOT NULL,
  tipo_proyecto   categoria_servicio,
  -- Financials
  moneda          moneda_tipo        NOT NULL DEFAULT 'CLP',
  subtotal        NUMERIC(14, 2)     NOT NULL DEFAULT 0,
  descuento       NUMERIC(5, 2)      NOT NULL DEFAULT 0,   -- percentage
  impuesto        NUMERIC(14, 2)     NOT NULL DEFAULT 0,
  total           NUMERIC(14, 2)     NOT NULL DEFAULT 0,
  -- Meta
  estado          estado_presupuesto NOT NULL DEFAULT 'borrador',
  validez_dias    INTEGER            NOT NULL DEFAULT 30,
  fecha_emision   DATE               NOT NULL DEFAULT CURRENT_DATE,
  notas           TEXT,
  condiciones     TEXT,
  creado_por      UUID               REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── Ítems del presupuesto ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuesto_items (
  id                      UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  presupuesto_id          UUID               NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  servicio_id             UUID               REFERENCES servicios(id) ON DELETE SET NULL,
  descripcion_personalizada VARCHAR(400),
  categoria               categoria_servicio,
  cantidad                NUMERIC(10, 2)     NOT NULL DEFAULT 1,
  precio_unitario         NUMERIC(14, 2)     NOT NULL DEFAULT 0,
  subtotal                NUMERIC(14, 2)     NOT NULL DEFAULT 0,
  notas                   TEXT,
  orden                   INTEGER            NOT NULL DEFAULT 0
);

-- ── Configuración general ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  id         SERIAL      PRIMARY KEY,
  clave      VARCHAR(80) NOT NULL UNIQUE,
  valor      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado      ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente_id  ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_created_at  ON presupuestos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_pid    ON presupuesto_items(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria      ON servicios(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_activo         ON servicios(activo);

-- ── Auto-updated updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_usuarios_upd    BEFORE UPDATE ON usuarios    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_servicios_upd   BEFORE UPDATE ON servicios   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_clientes_upd    BEFORE UPDATE ON clientes    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_presupuestos_upd BEFORE UPDATE ON presupuestos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Default configuración ─────────────────────────────────────
INSERT INTO configuracion (clave, valor) VALUES
  ('iva_porcentaje',   '19'),
  ('moneda_default',   'CLP'),
  ('validez_default',  '30'),
  ('condiciones_default', 'Presupuesto válido por 30 días desde su emisión. 50% de anticipo para iniciar el proyecto. El saldo se cancela contra entrega de archivos finales.')
ON CONFLICT (clave) DO NOTHING;
