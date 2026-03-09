#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import mysql.connector

# Conectar a la DB
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Amaamama12345.",
    database="scraping",
    charset='utf8mb4'
)
cur = conn.cursor()

print("🔄 Convirtiendo tabla_Normalizada_final en VISTA...")
print("   Esto hará que se actualice automáticamente cada vez que cambien los datos")

# Primero, dropear la tabla/vista si existe
try:
    cur.execute("DROP TABLE IF EXISTS tabla_Normalizada_final")
    cur.execute("DROP VIEW IF EXISTS tabla_Normalizada_final")
    print("   ✅ Tabla/Vista anterior eliminada")
except Exception as e:
    print(f"   ℹ️  Tabla no existía o error: {str(e)[:50]}")

# Crear la VISTA con deduplicación automática
print("\n💾 Creando VISTA tabla_Normalizada_final...")

# Usar CTEs y window functions para deduplicar
sql_vista = """
CREATE VIEW tabla_Normalizada_final AS
WITH ranked_records AS (
  SELECT 
    rcm.tabla_id,
    rcm.id,
    rcm.id_investigador,
    rcm.nombre,
    rcm.categoria,
    rcm.tipo_proyecto,
    rcm.titulo_proyecto,
    rcm.nodo_padre_resultados,
    rcm.anio,
    rcm.tipo_grouplab,
    rcm.nodo_padre_grouplab,
    rcm.nombre_grupo_grouplab,
    rcm.sigla_grupo_grouplab,
    rcm.titulo_grouplab,
    rcm.titulo_original_grouplab,
    rcm.titulo_normalizado,
    rcm.autor_1_grouplab,
    rcm.autor_2_grouplab,
    rcm.autor_3_grouplab,
    rcm.autor_4_grouplab,
    rcm.autor_5_grouplab,
    rcm.issn,
    rcm.isbn,
    rcm.revista,
    rcm.ano_grouplab,
    rel.facultad,
    rel.programa_academico,
    ROW_NUMBER() OVER (
      PARTITION BY rcm.tipo_proyecto, rcm.titulo_normalizado, rcm.anio 
      ORDER BY (CASE WHEN rcm.nodo_padre_resultados IS NOT NULL THEN 1 ELSE 0 END) DESC,
               rcm.tabla_id
    ) as rn
  FROM resultados_coincidentes_materializada rcm
  LEFT JOIN investigadores inv ON rcm.id_investigador = inv.id_investigador
  LEFT JOIN (
    SELECT
      ipf.id_investigador,
      GROUP_CONCAT(DISTINCT f.nombre_facultad ORDER BY f.nombre_facultad SEPARATOR ' / ') AS facultad,
      GROUP_CONCAT(DISTINCT p.nombre_programa ORDER BY p.nombre_programa SEPARATOR ' / ') AS programa_academico
    FROM investigador_programa_facultad ipf
    LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
    LEFT JOIN programa p ON p.id_programa = ipf.id_programa
    GROUP BY ipf.id_investigador
  ) rel ON rel.id_investigador = inv.id_investigador
)
SELECT 
  tabla_id, id, id_investigador, nombre, categoria, tipo_proyecto, titulo_proyecto,
  nodo_padre_resultados, anio, tipo_grouplab, nodo_padre_grouplab, nombre_grupo_grouplab, sigla_grupo_grouplab, titulo_grouplab,
  titulo_original_grouplab, titulo_normalizado, autor_1_grouplab, autor_2_grouplab,
  autor_3_grouplab, autor_4_grouplab, autor_5_grouplab, issn, isbn, revista,
  ano_grouplab, facultad, programa_academico
FROM ranked_records
WHERE rn = 1
"""

try:
    cur.execute(sql_vista)
    print("   ✅ VISTA creada exitosamente")
except Exception as e:
    print(f"   ❌ Error al crear vista: {e}")
    conn.close()
    exit(1)

conn.commit()

# Verificación
cur.execute("SELECT COUNT(*) as total FROM tabla_Normalizada_final")
result = cur.fetchone()
total_records = result[0] if result else 0

print("\n" + "="*80)
print("📊 RESUMEN")
print("="*80)
print(f"✅ tabla_Normalizada_final es ahora una VISTA")
print(f"📊 Registros: {total_records}")
print(f"🔄 Se actualiza automáticamente cuando cambian los datos de:")
print(f"   • resultados_coincidentes_materializada")
print(f"   • investigadores")

print(f"\n📋 Deduplicación en tiempo real por:")
print(f"   • tipo_proyecto")
print(f"   • titulo_normalizado")
print(f"   • anio")
print(f"   Mantiene: registro con mejor metadata (nodo_padre)")

print(f"\n📋 Columnas (sin autor_6, 7, 8):")
cur.execute("DESCRIBE tabla_Normalizada_final")
cols = cur.fetchall()
col_names = [col[0] for col in cols]
print(f"   {', '.join(col_names)}")

# Ejemplos
print(f"\n📋 Ejemplos:")
cur.execute("""
    SELECT id, nombre, facultad, programa_academico, tipo_proyecto, anio 
    FROM tabla_Normalizada_final 
    LIMIT 5
""")
ejemplos = cur.fetchall()

for i, row in enumerate(ejemplos, 1):
    fac = row[2][:20] if row[2] else "N/A"
    prog = row[3][:20] if row[3] else "N/A"
    tipo = row[4][:25] if row[4] else "N/A"
    print(f"   {i}. {row[1][:30]:30} | {fac:20} | {prog:20}")

cur.close()
conn.close()

print("\n✅ ¡VISTA tabla_Normalizada_final lista!")
print("   Ahora se actualiza automáticamente en cada scraping\n")
