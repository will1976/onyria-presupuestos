ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS porcentaje_boleta NUMERIC(5, 2) DEFAULT 0;

ALTER TABLE presupuesto_items
  ADD COLUMN IF NOT EXISTS porcentaje_boleta NUMERIC(5, 2) DEFAULT 0;
