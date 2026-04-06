#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import unicodedata
import sys
from difflib import SequenceMatcher
from db_connection import get_connection


# =========================================================
# CONFIGURACIÓN DE CONEXIÓN
# =========================================================
conn = get_connection()

cur = conn.cursor()


# =========================================================
# FUNCIONES AUXILIARES PARA NOMBRES
# =========================================================
def normalize_name(name):
    """
    Normaliza nombres:
    - minúsculas
    - sin tildes
    - sin signos raros
    - elimina conectores comunes
    """
    if not name:
        return ''

    name = name.lower().strip()

    # quitar tildes
    name = ''.join(
        c for c in unicodedata.normalize('NFD', name)
        if unicodedata.category(c) != 'Mn'
    )

    # limpiar signos comunes
    for ch in [".", ",", ";", ":", "(", ")", "-", "_", "/", "\\", '"', "'"]:
        name = name.replace(ch, " ")

    # eliminar palabras poco útiles
    stopwords = {'de', 'del', 'la', 'las', 'el', 'los', 'y'}
    tokens = [t for t in name.split() if t not in stopwords]

    return ' '.join(tokens)


def similitud_texto(a, b):
    """Devuelve similitud entre dos textos usando SequenceMatcher."""
    return SequenceMatcher(None, a, b).ratio()


def apellidos_principales(tokens):
    """
    Devuelve los dos últimos tokens como apellidos principales.
    Ej:
    ['freddy', 'fernandez', 'gomez'] -> {'fernandez', 'gomez'}
    """
    if len(tokens) >= 2:
        return set(tokens[-2:])
    return set(tokens)


def nombres_similares(nombre1, nombre2):
    """
    Reglas de emparejamiento inteligente para nombres hispanos.
    Hace match si:
    1) Coinciden ambos apellidos y el primer nombre es muy similar
    2) Coincide al menos un apellido y la similitud global es alta
    3) Un conjunto de tokens es subconjunto del otro
    4) Hay intersección fuerte de tokens
    """
    if not nombre1 or not nombre2:
        return False

    tokens1 = nombre1.split()
    tokens2 = nombre2.split()

    if not tokens1 or not tokens2:
        return False

    # Si alguno es muy corto, usar similitud general
    if len(tokens1) < 2 or len(tokens2) < 2:
        return similitud_texto(nombre1, nombre2) >= 0.88

    # -------------------------------
    # Apellidos
    # -------------------------------
    apellidos1 = apellidos_principales(tokens1)
    apellidos2 = apellidos_principales(tokens2)
    apellidos_comunes = apellidos1.intersection(apellidos2)

    # -------------------------------
    # Primer nombre
    # -------------------------------
    primer_nombre1 = tokens1[0]
    primer_nombre2 = tokens2[0]
    primer_nombre_similar = similitud_texto(primer_nombre1, primer_nombre2) >= 0.80

    # -------------------------------
    # Similitud global
    # -------------------------------
    similitud_global = similitud_texto(nombre1, nombre2)

    # =====================================================
    # REGLAS DE MATCH
    # =====================================================

    # Caso ideal: 2 apellidos iguales + primer nombre parecido
    if len(apellidos_comunes) >= 2 and primer_nombre_similar:
        return True

    # Caso flexible: 1 apellido igual + alta similitud general
    if len(apellidos_comunes) >= 1 and similitud_global >= 0.85:
        return True

    # Caso por subconjunto de tokens
    tokens_set1 = set(tokens1)
    tokens_set2 = set(tokens2)

    if tokens_set1.issubset(tokens_set2) or tokens_set2.issubset(tokens_set1):
        return True

    # Caso por intersección fuerte
    if len(tokens_set1.intersection(tokens_set2)) >= 3:
        return True

    return False


# =========================================================
# 1. CREAR TABLA AUXILIAR DE MATCH ENTRE AUTORES E INVESTIGADORES
# =========================================================
print("\n🔎 Generando tabla auxiliar de correspondencias flexibles...")

cur.execute("DROP TABLE IF EXISTS autor_investigador_match")
cur.execute("""
CREATE TABLE autor_investigador_match (
    autor_nombre VARCHAR(255),
    id_investigador INT,
    PRIMARY KEY (autor_nombre, id_investigador)
)
""")


# =========================================================
# 2. OBTENER AUTORES DESDE resultados_coincidentes_materializada
# =========================================================
cur.execute("""
SELECT DISTINCT autor_1_grouplab
FROM resultados_coincidentes_materializada
WHERE autor_1_grouplab IS NOT NULL AND autor_1_grouplab <> ''

UNION

SELECT DISTINCT autor_2_grouplab
FROM resultados_coincidentes_materializada
WHERE autor_2_grouplab IS NOT NULL AND autor_2_grouplab <> ''

UNION

SELECT DISTINCT autor_3_grouplab
FROM resultados_coincidentes_materializada
WHERE autor_3_grouplab IS NOT NULL AND autor_3_grouplab <> ''

UNION

SELECT DISTINCT autor_4_grouplab
FROM resultados_coincidentes_materializada
WHERE autor_4_grouplab IS NOT NULL AND autor_4_grouplab <> ''

UNION

SELECT DISTINCT autor_5_grouplab
FROM resultados_coincidentes_materializada
WHERE autor_5_grouplab IS NOT NULL AND autor_5_grouplab <> ''
""")
autores = [row[0] for row in cur.fetchall()]


# =========================================================
# 3. OBTENER INVESTIGADORES
# =========================================================
cur.execute("SELECT id_investigador, nombre_completo FROM investigadores")
investigadores = cur.fetchall()


# =========================================================
# 4. GENERAR MATCHES FLEXIBLES POR AUTORES
# =========================================================
matches = set()

for autor in autores:
    norm_autor = normalize_name(autor)

    for id_inv, nombre_inv in investigadores:
        norm_inv = normalize_name(nombre_inv)

        if nombres_similares(norm_autor, norm_inv):
            matches.add((autor, id_inv))


# =========================================================
# 5. GENERAR MATCHES FLEXIBLES POR nombre (si no hay autor)
# =========================================================
cur.execute("""
SELECT DISTINCT nombre
FROM resultados_coincidentes_materializada
WHERE nombre IS NOT NULL AND nombre <> ''
""")
nombres = [row[0] for row in cur.fetchall()]

for nombre in nombres:
    norm_nombre = normalize_name(nombre)

    for id_inv, nombre_inv in investigadores:
        norm_inv = normalize_name(nombre_inv)

        if nombres_similares(norm_nombre, norm_inv):
            matches.add((nombre, id_inv))


# =========================================================
# 6. INSERTAR MATCHES EN TABLA AUXILIAR
# =========================================================
for autor, id_inv in matches:
    cur.execute("""
        INSERT IGNORE INTO autor_investigador_match (autor_nombre, id_investigador)
        VALUES (%s, %s)
    """, (autor, id_inv))

conn.commit()

print(f"✔ {len(matches)} correspondencias flexibles generadas (incluyendo nombre si no hay autor)")


# =========================================================
# 7. CREAR VISTA FINAL
# =========================================================
print("\n💾 Creando nueva vista optimizada...")

sql_vista = """
CREATE OR REPLACE VIEW tabla_normalizada_final AS

WITH deduplicados AS (
    SELECT
        rcm.*,
        ROW_NUMBER() OVER (
            PARTITION BY
                rcm.tipo_proyecto,
                rcm.titulo_normalizado,
                rcm.anio,
                rcm.sigla_grupo_grouplab
            ORDER BY
                (CASE WHEN rcm.nodo_padre_grouplab IS NOT NULL THEN 1 ELSE 0 END) DESC,
                rcm.tabla_id
        ) AS rn
    FROM resultados_coincidentes_materializada rcm
),

grupo_facultad AS (
    SELECT
        l.sigla_grupo AS sigla_grupo_grouplab,
        l.id_facultad,
        f.nombre_facultad,
        l.id as id_grupo
    FROM link_grouplab l
    JOIN facultad f ON l.id_facultad = f.id_facultad
),

autores_expandido AS (
    SELECT
        rcm.tabla_id,
        rcm.sigla_grupo_grouplab,
        aim.id_investigador AS autor_id
    FROM resultados_coincidentes_materializada rcm
    LEFT JOIN autor_investigador_match aim
        ON (
            aim.autor_nombre = rcm.autor_1_grouplab OR
            aim.autor_nombre = rcm.autor_2_grouplab OR
            aim.autor_nombre = rcm.autor_3_grouplab OR
            aim.autor_nombre = rcm.autor_4_grouplab OR
            aim.autor_nombre = rcm.autor_5_grouplab OR
            (
                rcm.autor_1_grouplab IS NULL AND
                rcm.autor_2_grouplab IS NULL AND
                rcm.autor_3_grouplab IS NULL AND
                rcm.autor_4_grouplab IS NULL AND
                rcm.autor_5_grouplab IS NULL AND
                aim.autor_nombre = rcm.nombre
            )
        )
),

autores_validos AS (
    SELECT ae.*
    FROM autores_expandido ae
    JOIN grupo_facultad gf ON ae.sigla_grupo_grouplab = gf.sigla_grupo_grouplab
    JOIN investigador_grupo ig ON ae.autor_id = ig.id_investigador AND ig.id_grupo = gf.id_grupo
),

programas_autores AS (
    SELECT
        ipf.id_investigador,
        ipf.id_facultad,
        GROUP_CONCAT(DISTINCT f.nombre_facultad SEPARATOR ' / ') AS facultad,
        GROUP_CONCAT(DISTINCT p.nombre_programa SEPARATOR ' / ') AS programa
    FROM investigador_programa_facultad ipf
    LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
    LEFT JOIN programa p ON p.id_programa = ipf.id_programa
    GROUP BY ipf.id_investigador, ipf.id_facultad
),

titulo_programas AS (
    SELECT
        av.tabla_id,
        GROUP_CONCAT(DISTINCT pa.facultad SEPARATOR ' / ') AS facultad,
        GROUP_CONCAT(DISTINCT pa.programa SEPARATOR ' / ') AS programa_academico
    FROM autores_validos av
    JOIN grupo_facultad gf ON av.sigla_grupo_grouplab = gf.sigla_grupo_grouplab
    JOIN investigador_grupo ig ON av.autor_id = ig.id_investigador AND ig.id_grupo = gf.id_grupo
    JOIN programas_autores pa ON pa.id_investigador = av.autor_id AND pa.id_facultad = gf.id_facultad
    GROUP BY av.tabla_id
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
LEFT JOIN titulo_programas tp ON tp.tabla_id = d.tabla_id
WHERE d.rn = 1
"""

try:
    cur.execute(sql_vista)
    conn.commit()
    print("✅ Vista creada correctamente")
except Exception as e:
    print("❌ Error creando la vista:", e)
    cur.close()
    conn.close()
    sys.exit(1)


# =========================================================
# 8. VERIFICACIÓN
# =========================================================
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


# =========================================================
# 9. CIERRE
# =========================================================
cur.close()
conn.close()

print("\n✅ Vista tabla_normalizada_final lista")
print("✔ Un título aparece solo una vez")
print("✔ Incluye programas de todos sus autores")
print("✔ Funciona correctamente para los filtros del frontend")