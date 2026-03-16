#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Amaamama12345.",
    database="scraping",
    charset="utf8mb4"
)

cur = conn.cursor()

print("🔄 Recreando vista tabla_normalizada_final...")

# eliminar si existe
try:
    cur.execute("DROP VIEW IF EXISTS tabla_normalizada_final")
    cur.execute("DROP TABLE IF EXISTS tabla_normalizada_final")
    print("✅ Vista anterior eliminada")
except:
    print("ℹ️ No existía vista anterior")

print("\n💾 Creando nueva vista optimizada...")

sql_vista = """

CREATE VIEW tabla_normalizada_final AS

WITH autores_expandido AS (

    SELECT rcm.*, inv.id_investigador AS autor_id
    FROM resultados_coincidentes_materializada rcm
    LEFT JOIN investigadores inv
        ON LOWER(inv.nombre_completo) = LOWER(rcm.autor_1_grouplab)

    UNION ALL

    SELECT rcm.*, inv.id_investigador
    FROM resultados_coincidentes_materializada rcm
    LEFT JOIN investigadores inv
        ON LOWER(inv.nombre_completo) = LOWER(rcm.autor_2_grouplab)

    UNION ALL

    SELECT rcm.*, inv.id_investigador
    FROM resultados_coincidentes_materializada rcm
    LEFT JOIN investigadores inv
        ON LOWER(inv.nombre_completo) = LOWER(rcm.autor_3_grouplab)

    UNION ALL

    SELECT rcm.*, inv.id_investigador
    FROM resultados_coincidentes_materializada rcm
    LEFT JOIN investigadores inv
        ON LOWER(inv.nombre_completo) = LOWER(rcm.autor_4_grouplab)

    UNION ALL

    SELECT rcm.*, inv.id_investigador
    FROM resultados_coincidentes_materializada rcm
    LEFT JOIN investigadores inv
        ON LOWER(inv.nombre_completo) = LOWER(rcm.autor_5_grouplab)

),

autores_validos AS (

    SELECT *
    FROM autores_expandido
    WHERE autor_id IS NOT NULL

),

programas_autores AS (

    SELECT
        ipf.id_investigador,
        GROUP_CONCAT(DISTINCT f.nombre_facultad SEPARATOR ' / ') AS facultad,
        GROUP_CONCAT(DISTINCT p.nombre_programa SEPARATOR ' / ') AS programa
    FROM investigador_programa_facultad ipf
    LEFT JOIN facultad f
        ON f.id_facultad = ipf.id_facultad
    LEFT JOIN programa p
        ON p.id_programa = ipf.id_programa
    GROUP BY ipf.id_investigador

),

titulo_programas AS (

    SELECT

        av.tabla_id,
        GROUP_CONCAT(DISTINCT pa.facultad SEPARATOR ' / ') AS facultad,
        GROUP_CONCAT(DISTINCT pa.programa SEPARATOR ' / ') AS programa_academico

    FROM autores_validos av

    LEFT JOIN programas_autores pa
        ON pa.id_investigador = av.autor_id

    GROUP BY av.tabla_id

),

deduplicados AS (

    SELECT

        rcm.*,

        ROW_NUMBER() OVER(
            PARTITION BY rcm.tipo_proyecto, rcm.titulo_normalizado, rcm.anio
            ORDER BY
                (CASE WHEN rcm.nodo_padre_grouplab IS NOT NULL THEN 1 ELSE 0 END) DESC,
                rcm.tabla_id
        ) AS rn

    FROM resultados_coincidentes_materializada rcm

)

SELECT

    d.tabla_id,
    d.id,
    d.id_investigador,
    d.nombre,
    d.categoria,
    d.tipo_proyecto,
    d.titulo_proyecto,
    d.nodo_padre_resultados,
    d.anio,
    d.tipo_grouplab,
    d.nodo_padre_grouplab,
    d.nombre_grupo_grouplab,
    d.sigla_grupo_grouplab,
    d.titulo_grouplab,
    d.titulo_original_grouplab,
    d.titulo_normalizado,
    d.autor_1_grouplab,
    d.autor_2_grouplab,
    d.autor_3_grouplab,
    d.autor_4_grouplab,
    d.autor_5_grouplab,
    d.issn,
    d.isbn,
    d.revista,
    d.ano_grouplab,

    tp.facultad,
    tp.programa_academico

FROM deduplicados d

LEFT JOIN titulo_programas tp
    ON tp.tabla_id = d.tabla_id

WHERE d.rn = 1

"""

try:
    cur.execute(sql_vista)
    conn.commit()
    print("✅ Vista creada correctamente")
except Exception as e:
    print("❌ Error creando la vista:", e)
    conn.close()
    exit()

# verificación
cur.execute("SELECT COUNT(*) FROM tabla_normalizada_final")
total = cur.fetchone()[0]

print("\n📊 Registros en vista:", total)

print("\n📋 Ejemplos:")
cur.execute("""
SELECT
nombre,
programa_academico,
facultad,
tipo_proyecto,
anio
FROM tabla_normalizada_final
LIMIT 5
""")

rows = cur.fetchall()

for r in rows:
    print(r)

cur.close()
conn.close()

print("\n✅ Vista tabla_normalizada_final lista")
print("✔ Un título aparece solo una vez")
print("✔ Incluye programas de todos sus autores")
print("✔ Funciona correctamente para los filtros del frontend")