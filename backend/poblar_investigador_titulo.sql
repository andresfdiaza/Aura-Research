-- Script para poblar la tabla investigador_titulo a partir de los autores de titulo_grouplab_clean
-- Ejecuta este script en tu base de datos MySQL

INSERT INTO investigador_titulo (id_investigador, id_titulo, orden_autor, created_at)
SELECT i.id_investigador, autor.id, autor.orden_autor, NOW()
FROM (
    SELECT id, autor_1 AS autor, 1 AS orden_autor FROM titulo_grouplab_clean WHERE autor_1 IS NOT NULL AND autor_1 <> ''
    UNION ALL
    SELECT id, autor_2, 2 FROM titulo_grouplab_clean WHERE autor_2 IS NOT NULL AND autor_2 <> ''
    UNION ALL
    SELECT id, autor_3, 3 FROM titulo_grouplab_clean WHERE autor_3 IS NOT NULL AND autor_3 <> ''
    UNION ALL
    SELECT id, autor_4, 4 FROM titulo_grouplab_clean WHERE autor_4 IS NOT NULL AND autor_4 <> ''
    UNION ALL
    SELECT id, autor_5, 5 FROM titulo_grouplab_clean WHERE autor_5 IS NOT NULL AND autor_5 <> ''
) AS autor
JOIN investigadores i ON i.nombre_completo = autor.autor;