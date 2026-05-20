-- Celda Excel configurable por servicio.
-- Formato: una letra (o más) de columna + número de fila. Ej: A15, B22, AA105.
-- La exportación Excel agrupa servicios por esta celda y suma cantidades.

ALTER TABLE servicios ADD COLUMN excel_cell TEXT;
