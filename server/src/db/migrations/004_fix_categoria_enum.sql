-- Cambiar columnas de enum categoria_servicio a TEXT
-- El enum original no coincide con las categorías actuales de la app

ALTER TABLE servicios          ALTER COLUMN categoria     TYPE TEXT;
ALTER TABLE presupuesto_items  ALTER COLUMN categoria     TYPE TEXT;
ALTER TABLE presupuestos       ALTER COLUMN tipo_proyecto TYPE TEXT;

DROP TYPE IF EXISTS categoria_servicio;
