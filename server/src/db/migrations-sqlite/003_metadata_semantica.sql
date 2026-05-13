-- Agrega columnas de metadata semántica para mejorar la búsqueda IA.
-- aliases, tags, subcategoria YA EXISTEN en 001_init.sql; sólo añadimos las dos nuevas.
-- SQLite no tiene ADD COLUMN IF NOT EXISTS, pero el runner registra qué migraciones se
-- ejecutaron en _migrations, así que esta solo corre una vez.

ALTER TABLE servicios ADD COLUMN casos_uso TEXT;
ALTER TABLE servicios ADD COLUMN no_aplica TEXT;
