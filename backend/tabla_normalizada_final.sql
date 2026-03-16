-- Vista para producción académica filtrable por programa y facultad, considerando títulos multi-autor
CREATE OR REPLACE VIEW tabla_normalizada_final AS
SELECT DISTINCT
  t.id AS id_titulo,
  t.titulo,
  t.titulo_normalizado,
  t.ano,
  p.id_programa,
  p.nombre_programa,
  f.id_facultad,
  f.nombre_facultad,
  GROUP_CONCAT(DISTINCT i.nombre_completo) AS autores
FROM titulo_grouplab_clean t
JOIN investigador_titulo it ON it.id_titulo = t.id
JOIN investigadores i ON i.id_investigador = it.id_investigador
JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
JOIN programa p ON p.id_programa = ipf.id_programa
JOIN facultad f ON f.id_facultad = ipf.id_facultad
GROUP BY t.id, p.id_programa, f.id_facultad, t.titulo, t.titulo_normalizado, t.ano, p.nombre_programa, f.nombre_facultad;