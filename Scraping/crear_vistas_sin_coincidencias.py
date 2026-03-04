import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Amaamama12345.',
    database='scraping',
    charset='utf8mb4',
    use_unicode=True
)
cur = conn.cursor()

print("🔄 Creando vistas de registros SIN coincidencias...")
print()

# ============================================================
# 1. Vista: CVLAC (resultados) sin match en titulo_grouplab_clean
# ============================================================
print("📝 Recreando vista_resultados_sin_coincidencia...")

cur.execute("DROP VIEW IF EXISTS vista_resultados_sin_coincidencia")

vista_resultados_sin = """
CREATE VIEW vista_resultados_sin_coincidencia AS
SELECT 
    r.id,
    r.id_investigador,
    r.nombre,
    r.categoria,
    r.tipo_proyecto,
    r.titulo_proyecto,
    r.nodo_padre,
    r.anio
FROM resultados r
WHERE NOT EXISTS (
    SELECT 1
    FROM resultados_coincidentes_materializada rc
    WHERE rc.id = r.id
)
"""

cur.execute(vista_resultados_sin)
conn.commit()

cur.execute("SELECT COUNT(*) FROM vista_resultados_sin_coincidencia")
count_resultados_sin = cur.fetchone()[0]
print(f"✅ Vista creada. Total registros: {count_resultados_sin}")

# ============================================================
# 2. Vista: titulo_grouplab_clean sin match en resultados
# ============================================================
print()
print("📝 Recreando vista_grouplab_clean_sin_coincidencia...")

cur.execute("DROP VIEW IF EXISTS vista_grouplab_clean_sin_coincidencia")

vista_grouplab_sin = """
CREATE VIEW vista_grouplab_clean_sin_coincidencia AS
SELECT 
    t.tipo,
    t.nodo_padre,
    t.titulo,
    t.titulo_original,
    t.titulo_normalizado,
    t.autor_1,
    t.autor_2,
    t.autor_3,
    t.autor_4,
    t.autor_5,
    t.autor_6,
    t.autor_7,
    t.autor_8,
    t.issn,
    t.isbn,
    t.revista,
    t.ano
FROM titulo_grouplab_clean t
WHERE NOT EXISTS (
    SELECT 1
    FROM resultados_coincidentes_materializada rc
    WHERE rc.tipo_grouplab = t.tipo
      AND rc.titulo_normalizado = t.titulo_normalizado
      AND COALESCE(rc.ano_grouplab, '') = COALESCE(t.ano, '')
)
"""

cur.execute(vista_grouplab_sin)
conn.commit()

cur.execute("SELECT COUNT(*) FROM vista_grouplab_clean_sin_coincidencia")
count_grouplab_sin = cur.fetchone()[0]
print(f"✅ Vista creada. Total registros: {count_grouplab_sin}")

# ============================================================
# 3. Validación final
# ============================================================
print()
print("=" * 80)
print("RESUMEN")
print("=" * 80)

cur.execute("SELECT COUNT(*) FROM resultados")
total_cvlac = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM titulo_grouplab_clean")
total_grouplab = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM resultados_coincidentes_materializada")
total_coincidencias = cur.fetchone()[0]

cur.execute("SELECT COUNT(DISTINCT id) FROM resultados_coincidentes_materializada")
total_coincidencias_cvlac_unicas = cur.fetchone()[0]

cur.execute("SELECT COUNT(DISTINCT CONCAT(titulo_grouplab, '|', tipo_grouplab, '|', COALESCE(ano_grouplab, ''))) FROM resultados_coincidentes_materializada")
total_coincidencias_grouplab_unicas = cur.fetchone()[0]

print(f"📊 Total CVLAC (resultados): {total_cvlac}")
print(f"📊 Total GroupLab (titulo_grouplab_clean): {total_grouplab}")
print(f"📊 Coincidencias: {total_coincidencias}")
print(f"📊 Coincidencias CVLAC únicas: {total_coincidencias_cvlac_unicas}")
print(f"📊 Coincidencias GroupLab únicas: {total_coincidencias_grouplab_unicas}")
print(f"📊 CVLAC sin match: {count_resultados_sin}")
print(f"📊 GroupLab sin match: {count_grouplab_sin}")
print()
print(f"✅ Verificación CVLAC: {total_cvlac} = {total_coincidencias_cvlac_unicas} + {count_resultados_sin} = {total_coincidencias_cvlac_unicas + count_resultados_sin}")
print(f"✅ Verificación GroupLab: {total_grouplab} = {total_coincidencias_grouplab_unicas} + {count_grouplab_sin} = {total_coincidencias_grouplab_unicas + count_grouplab_sin}")

# Mostrar ejemplos
print()
print("📋 Ejemplos de CVLAC sin match (primeros 3):")
cur.execute("""
    SELECT nombre, tipo_proyecto, LEFT(titulo_proyecto, 60), anio
    FROM vista_resultados_sin_coincidencia
    LIMIT 3
""")
for nombre, tipo, titulo, anio in cur.fetchall():
    print(f"  • {nombre} | {tipo} | {titulo}... | {anio}")

print()
print("📋 Ejemplos de GroupLab sin match (primeros 3):")
cur.execute("""
    SELECT tipo, LEFT(titulo, 60), ano
    FROM vista_grouplab_clean_sin_coincidencia
    LIMIT 3
""")
for tipo, titulo, ano in cur.fetchall():
    print(f"  • {tipo} | {titulo}... | {ano}")

cur.close()
conn.close()

print()
print("✅ Vistas de no-coincidencias creadas exitosamente")
