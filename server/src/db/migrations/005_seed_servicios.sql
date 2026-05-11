-- Seed del catálogo de servicios de Onyria Studio
-- Solo inserta si la tabla está vacía (idempotente)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM servicios LIMIT 1) THEN

    INSERT INTO servicios (nombre, categoria, descripcion, precio_base, porcentaje_boleta, unidad, moneda, activo) VALUES
      ('Reducción 50% — Valor Armado Madre', 'Estudio', 'Reducción del 50% aplicada sobre el valor del producto madre armado', 0, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 1'' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 200000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 1'' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 250000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 10'''' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 80000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 10'''' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 80000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 15'''' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 120000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 15'''' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 120000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 2'' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 250000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 20'''' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 150000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 20'''' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 150000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 30'''' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 150000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 30'''' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 150000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 45'''' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 180000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 45'''' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 200000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 6'''' — Solo Digital', 'Estudio', 'Post producción publicitaria — derechos Solo Digital', 80000, 0, 'por pieza', 'CLP', true),
      ('Sonorización / Post / Mix / Master 6'''' — TV + Digital', 'Estudio', 'Post producción publicitaria — derechos TV + Digital', 80000, 0, 'por pieza', 'CLP', true),
      ('Casting — Digital, TV o Radio', 'Estudio', 'Servicio de casting para producción digital, televisión o radio', 50000, 0, 'por pieza', 'CLP', true),
      ('Música Archivo — Digital', 'musica_archivo', 'Licencia de música de archivo para medios digitales', 50000, 0, 'por pieza', 'CLP', true),
      ('Música Archivo — TV', 'musica_archivo', 'Licencia de música de archivo para televisión (200 USD)', 200, 0, 'por pieza', 'USD', true),
      ('Música Premium Beat o Similar TV (precio Costo)A62', 'musica_archivo', 'Música Archivo Música Premium Beat o Similar TV (precio Costo)', 200000, 1, 'por pieza', 'CLP', true),
      ('Música Premium Beat o Similar - Digital 50 USD', 'musica_archivo', 'Música Archivo Música Premium Beat o Similar - Digital 50 USD', 100000, 2, 'por pieza', 'CLP', true),
      ('Musica de Artlist / Envato - Digital', 'musica_archivo', 'Música Archivo Musica de Artlist / Envato - Digital', 100000, 3, 'por pieza', 'CLP', true),
      ('Musica de Artlist / Envato - Digital TV', 'musica_archivo', 'Música Archivo Musica de Artlist / Envato - Digital TV', 50000, 4, 'por pieza', 'CLP', true),
      ('Musica de Artlist / Envato - Radio', 'musica_archivo', 'Música Archivo Musica de Artlist / Envato - Radio', 30000, 5, 'por pieza', 'CLP', true),
      ('Música Original — Full Medios (TV+Digital+Radio)', 'musica_original', 'Música original 45'''' Chile, vigencia 6 a 12 meses — TV + Digital + Radio', 700000, 0, 'por pieza', 'CLP', true),
      ('Música Original — Solo Digital', 'musica_original', 'Música original 45'''' Chile, vigencia 6 a 12 meses — Solo Digital', 500000, 0, 'por pieza', 'CLP', true),
      ('Música Original — Solo TV', 'musica_original', 'Música original 45'''' Chile, vigencia 6 a 12 meses — Solo TV', 500000, 0, 'por pieza', 'CLP', true),
      ('Música Original — TV + Digital', 'musica_original', 'Música original 45'''' Chile, vigencia 6 a 12 meses — TV + Digital', 600000, 0, 'por pieza', 'CLP', true),
      ('Renovación Derechos — 1° Año', 'renovacion_derecho', '50% del Valor Inicial', 0, 0, 'por pieza', 'CLP', true),
      ('Renovación Derechos — 2° Año', 'renovacion_derecho', '50% del Valor Inicial', 0, 0, 'por pieza', 'CLP', true),
      ('Renovación Derechos — 3° Año', 'renovacion_derecho', '25% del Valor Inicial', 0, 0, 'por pieza', 'CLP', true),
      ('Renovación Derechos — 4° Año', 'renovacion_derecho', '25% del Valor Inicial', 0, 0, 'por pieza', 'CLP', true),
      ('Locución 1'' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 100000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 1'' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 200000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 10'''' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 80000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 10'''' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 100000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 15'''' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 80000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 15'''' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 120000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 2'' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 150000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 20'''' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 80000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 20'''' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 150000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 30'''' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 80000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 30'''' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 150000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 45'''' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 80000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 45'''' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 200000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 6'''' — Solo Digital', 'Locutor', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 50000, 15.25, 'por pieza', 'CLP', true),
      ('Locución 6'''' — TV + Digital', 'Locutor', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses', 80000, 15.25, 'por pieza', 'CLP', true),
      ('Personajes / Doblajes', 'Personajes - Doblajes', 'Personajes - Doblajes', 60000, 15.25, 'por pieza', 'CLP', true),
      ('Podcast — Grabación / Edición', 'podcast', 'Grabación y edición de podcast — valor por hora', 40000, 0, 'por hora', 'CLP', true);

    RAISE NOTICE 'Catálogo de servicios cargado correctamente';
  ELSE
    RAISE NOTICE 'Catálogo ya existe, omitiendo seed';
  END IF;
END $$;
