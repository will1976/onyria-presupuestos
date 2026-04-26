-- Agrega campo fragmento_cliente a presupuesto_items
-- Guarda la cita textual del cliente que originó cada ítem (solo uso interno, no aparece en PDF)
ALTER TABLE presupuesto_items
  ADD COLUMN IF NOT EXISTS fragmento_cliente TEXT;
