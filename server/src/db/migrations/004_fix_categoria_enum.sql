-- Cambiar columnas de enum categoria_servicio a TEXT (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='servicios' AND column_name='categoria'
               AND data_type <> 'text') THEN
    ALTER TABLE servicios ALTER COLUMN categoria TYPE TEXT USING categoria::TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='presupuesto_items' AND column_name='categoria'
               AND data_type <> 'text') THEN
    ALTER TABLE presupuesto_items ALTER COLUMN categoria TYPE TEXT USING categoria::TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='presupuestos' AND column_name='tipo_proyecto'
               AND data_type <> 'text') THEN
    ALTER TABLE presupuestos ALTER COLUMN tipo_proyecto TYPE TEXT USING tipo_proyecto::TEXT;
  END IF;
END $$;

DROP TYPE IF EXISTS categoria_servicio;
