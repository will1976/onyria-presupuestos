-- Seed del catálogo de servicios Onyria — solo se ejecuta si la tabla está vacía
-- SQLite no tiene DO blocks, así que usamos INSERT OR IGNORE con un check inicial vía CTE.

INSERT INTO servicios (nombre, categoria, descripcion, precio_base, porcentaje_boleta, unidad, moneda, activo)
SELECT * FROM (
  SELECT 'Reducción 50% — Valor Armado Madre' AS nombre, 'Estudio' AS categoria, 'Reducción del 50% aplicada sobre el valor del producto madre armado' AS descripcion, 0 AS precio_base, 0 AS porcentaje_boleta, 'por pieza' AS unidad, 'CLP' AS moneda, 1 AS activo
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 1'' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',200000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 1'' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',250000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 10'''' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',80000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 10'''' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',80000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 15'''' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',120000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 15'''' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',120000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 2'' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',250000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 20'''' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',150000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 20'''' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',150000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 30'''' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',150000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 30'''' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',150000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 45'''' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',180000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 45'''' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',200000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 6'''' — Solo Digital','Estudio','Post producción publicitaria — derechos Solo Digital',80000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Sonorización / Post / Mix / Master 6'''' — TV + Digital','Estudio','Post producción publicitaria — derechos TV + Digital',80000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Casting — Digital, TV o Radio','Estudio','Servicio de casting para producción digital, televisión o radio',50000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Música Archivo — Digital','musica_archivo','Licencia de música de archivo para medios digitales',50000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Música Archivo — TV','musica_archivo','Licencia de música de archivo para televisión (200 USD)',200,0,'por pieza','USD',1
  UNION ALL SELECT 'Música Premium Beat o Similar TV (precio Costo)A62','musica_archivo','Música Archivo Música Premium Beat o Similar TV (precio Costo)',200000,1,'por pieza','CLP',1
  UNION ALL SELECT 'Música Premium Beat o Similar - Digital 50 USD','musica_archivo','Música Archivo Música Premium Beat o Similar - Digital 50 USD',100000,2,'por pieza','CLP',1
  UNION ALL SELECT 'Musica de Artlist / Envato - Digital','musica_archivo','Música Archivo Musica de Artlist / Envato - Digital',100000,3,'por pieza','CLP',1
  UNION ALL SELECT 'Musica de Artlist / Envato - Digital TV','musica_archivo','Música Archivo Musica de Artlist / Envato - Digital TV',50000,4,'por pieza','CLP',1
  UNION ALL SELECT 'Musica de Artlist / Envato - Radio','musica_archivo','Música Archivo Musica de Artlist / Envato - Radio',30000,5,'por pieza','CLP',1
  UNION ALL SELECT 'Música Original — Full Medios (TV+Digital+Radio)','musica_original','Música original 45'''' Chile, vigencia 6 a 12 meses — TV + Digital + Radio',700000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Música Original — Solo Digital','musica_original','Música original 45'''' Chile, vigencia 6 a 12 meses — Solo Digital',500000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Música Original — Solo TV','musica_original','Música original 45'''' Chile, vigencia 6 a 12 meses — Solo TV',500000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Música Original — TV + Digital','musica_original','Música original 45'''' Chile, vigencia 6 a 12 meses — TV + Digital',600000,0,'por pieza','CLP',1
  UNION ALL SELECT 'Renovación Derechos — 1° Año','renovacion_derecho','50% del Valor Inicial',0,0,'por pieza','CLP',1
  UNION ALL SELECT 'Renovación Derechos — 2° Año','renovacion_derecho','50% del Valor Inicial',0,0,'por pieza','CLP',1
  UNION ALL SELECT 'Renovación Derechos — 3° Año','renovacion_derecho','25% del Valor Inicial',0,0,'por pieza','CLP',1
  UNION ALL SELECT 'Renovación Derechos — 4° Año','renovacion_derecho','25% del Valor Inicial',0,0,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 1'' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',100000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 1'' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',200000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 10'''' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',80000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 10'''' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',100000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 15'''' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',80000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 15'''' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',120000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 2'' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',150000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 20'''' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',80000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 20'''' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',150000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 30'''' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',80000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 30'''' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',150000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 45'''' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',80000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 45'''' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',200000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 6'''' — Solo Digital','Locutor','Valores referenciales locución — derechos Solo Digital hasta 12 meses',50000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Locución 6'''' — TV + Digital','Locutor','Valores referenciales locución — derechos TV + Digital hasta 12 meses',80000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Personajes / Doblajes','Personajes - Doblajes','Personajes - Doblajes',60000,15.25,'por pieza','CLP',1
  UNION ALL SELECT 'Podcast — Grabación / Edición','podcast','Grabación y edición de podcast — valor por hora',40000,0,'por hora','CLP',1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM servicios LIMIT 1);
