-- Timestamp del último embedding generado por servicio.
-- Permite rastrear qué servicios fueron reindexados y cuándo,
-- útil para auditoría y para evitar re-procesamientos innecesarios.

ALTER TABLE servicios ADD COLUMN embedding_updated_at TEXT;
