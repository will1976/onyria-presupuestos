-- Seed del catálogo de servicios de Onyria Studio
-- Solo inserta si la tabla está vacía (idempotente)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM servicios LIMIT 1) THEN

    INSERT INTO servicios (nombre, categoria, descripcion, precio_base, unidad, moneda) VALUES
      ('Sonorización 6'''' — TV + Digital',   'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  80000,  'por pieza', 'CLP'),
      ('Sonorización 10'''' — TV + Digital',  'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  80000,  'por pieza', 'CLP'),
      ('Sonorización 15'''' — TV + Digital',  'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  120000, 'por pieza', 'CLP'),
      ('Sonorización 20'''' — TV + Digital',  'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  150000, 'por pieza', 'CLP'),
      ('Sonorización 30'''' — TV + Digital',  'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  150000, 'por pieza', 'CLP'),
      ('Sonorización 45'''' — TV + Digital',  'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  200000, 'por pieza', 'CLP'),
      ('Sonorización 1'' — TV + Digital',     'sonorizacion', 'Post producción publicitaria — derechos TV + Digital',  250000, 'por pieza', 'CLP'),
      ('Sonorización 6'''' — Solo Digital',   'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  80000,  'por pieza', 'CLP'),
      ('Sonorización 10'''' — Solo Digital',  'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  80000,  'por pieza', 'CLP'),
      ('Sonorización 15'''' — Solo Digital',  'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  120000, 'por pieza', 'CLP'),
      ('Sonorización 20'''' — Solo Digital',  'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  150000, 'por pieza', 'CLP'),
      ('Sonorización 30'''' — Solo Digital',  'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  150000, 'por pieza', 'CLP'),
      ('Sonorización 45'''' — Solo Digital',  'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  180000, 'por pieza', 'CLP'),
      ('Sonorización 1'' — Solo Digital',     'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  200000, 'por pieza', 'CLP'),
      ('Sonorización 2'' — Solo Digital',     'sonorizacion', 'Post producción publicitaria — derechos Solo Digital',  250000, 'por pieza', 'CLP'),
      ('Reducción 50% — Valor Armado Madre',  'sonorizacion', 'Reducción del 50% aplicada sobre el valor del producto madre armado', 0, 'por pieza', 'CLP'),
      ('Casting — Digital, TV o Radio',       'casting',      'Servicio de casting para producción digital, televisión o radio', 50000, 'por pieza', 'CLP'),
      ('Música Archivo — Digital',            'musica_archivo', 'Licencia de música de archivo para medios digitales', 50000, 'por pieza', 'CLP'),
      ('Música Archivo — TV',                 'musica_archivo', 'Licencia de música de archivo para televisión (200 USD)', 200, 'por pieza', 'USD'),
      ('Música Original — Solo Digital',                   'musica_original', 'Música original Chile, vigencia 6 a 12 meses — Solo Digital',        500000, 'por pieza', 'CLP'),
      ('Música Original — Solo TV',                        'musica_original', 'Música original Chile, vigencia 6 a 12 meses — Solo TV',             500000, 'por pieza', 'CLP'),
      ('Música Original — TV + Digital',                   'musica_original', 'Música original Chile, vigencia 6 a 12 meses — TV + Digital',         600000, 'por pieza', 'CLP'),
      ('Música Original — Full Medios (TV+Digital+Radio)', 'musica_original', 'Música original Chile, vigencia 6 a 12 meses — Full Medios',          700000, 'por pieza', 'CLP'),
      ('Renovación Derechos — 1° Año',        'musica_original', '50% del Valor Inicial', 0, 'por pieza', 'CLP'),
      ('Renovación Derechos — 2° Año',        'musica_original', '50% del Valor Inicial', 0, 'por pieza', 'CLP'),
      ('Renovación Derechos — 3° Año',        'musica_original', '25% del Valor Inicial', 0, 'por pieza', 'CLP'),
      ('Renovación Derechos — 4° Año',        'musica_original', '25% del Valor Inicial', 0, 'por pieza', 'CLP'),
      ('Locución 6'''' — TV + Digital',       'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',   80000, 'por pieza', 'CLP'),
      ('Locución 10'''' — TV + Digital',      'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  100000, 'por pieza', 'CLP'),
      ('Locución 15'''' — TV + Digital',      'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  120000, 'por pieza', 'CLP'),
      ('Locución 20'''' — TV + Digital',      'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  150000, 'por pieza', 'CLP'),
      ('Locución 30'''' — TV + Digital',      'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  150000, 'por pieza', 'CLP'),
      ('Locución 45'''' — TV + Digital',      'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  200000, 'por pieza', 'CLP'),
      ('Locución 1'' — TV + Digital',         'locucion', 'Valores referenciales locución — derechos TV + Digital hasta 12 meses',  200000, 'por pieza', 'CLP'),
      ('Locución 6'''' — Solo Digital',       'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses',  50000, 'por pieza', 'CLP'),
      ('Locución 10'''' — Solo Digital',      'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses',  80000, 'por pieza', 'CLP'),
      ('Locución 15'''' — Solo Digital',      'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses',  80000, 'por pieza', 'CLP'),
      ('Locución 20'''' — Solo Digital',      'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses',  80000, 'por pieza', 'CLP'),
      ('Locución 30'''' — Solo Digital',      'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses',  80000, 'por pieza', 'CLP'),
      ('Locución 45'''' — Solo Digital',      'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses',  80000, 'por pieza', 'CLP'),
      ('Locución 1'' — Solo Digital',         'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 100000, 'por pieza', 'CLP'),
      ('Locución 2'' — Solo Digital',         'locucion', 'Valores referenciales locución — derechos Solo Digital hasta 12 meses', 150000, 'por pieza', 'CLP'),
      ('Podcast — Grabación / Edición',       'podcast',  'Grabación y edición de podcast — valor por hora', 40000, 'por hora', 'CLP');

    RAISE NOTICE 'Catálogo de servicios cargado correctamente';
  ELSE
    RAISE NOTICE 'Catálogo ya existe, omitiendo seed';
  END IF;
END $$;
