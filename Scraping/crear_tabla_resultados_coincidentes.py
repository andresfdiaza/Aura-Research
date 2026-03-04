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

print("🔄 Creando tabla materializada con JOIN exacto: resultados + titulo_grouplab_clean")
print("   Criterio: título + tipo + año")

cur.execute("DROP TABLE IF EXISTS resultados_coincidentes_materializada")

cur.execute("""
    CREATE TABLE resultados_coincidentes_materializada AS
    SELECT
        r.id,
        r.id_investigador,
        r.nombre,
        r.categoria,
        r.tipo_proyecto,
        r.titulo_proyecto,
        r.nodo_padre AS nodo_padre_resultados,
        r.anio,
        t.tipo AS tipo_grouplab,
        t.nodo_padre AS nodo_padre_grouplab,
        t.titulo AS titulo_grouplab,
        t.titulo_original AS titulo_original_grouplab,
        t.titulo_normalizado,
        t.autor_1 AS autor_1_grouplab,
        t.autor_2 AS autor_2_grouplab,
        t.autor_3 AS autor_3_grouplab,
        t.autor_4 AS autor_4_grouplab,
        t.autor_5 AS autor_5_grouplab,
        t.autor_6 AS autor_6_grouplab,
        t.autor_7 AS autor_7_grouplab,
        t.autor_8 AS autor_8_grouplab,
        t.issn,
        t.isbn,
        t.revista,
        t.ano AS ano_grouplab
        FROM (
                SELECT
                        r.id,
                        r.id_investigador,
                        r.nombre,
                        r.categoria,
                        r.tipo_proyecto,
                        r.titulo_proyecto,
                        r.nodo_padre,
                        r.anio,
                        LOWER(
                            TRIM(
                                REGEXP_REPLACE(
                                    REGEXP_REPLACE(
                                        REGEXP_REPLACE(
                                            REGEXP_REPLACE(
                                                COALESCE(r.titulo_proyecto, ''),
                                                '^(Formato Redcolsi: ?|FORMATO REDCOLSI: ?)',
                                                ''
                                            ),
                                            '[\\r\\n\\t]+',
                                            ' '
                                        ),
                                        '[.,:;]+',
                                        ''
                                    ),
                                    '[[:space:]]+',
                                    ' '
                                )
                            )
                        ) AS titulo_norm_match
                FROM resultados r
        ) r
        JOIN (
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
                        t.ano,
                        LOWER(
                            TRIM(
                                REGEXP_REPLACE(
                                    COALESCE(t.titulo_normalizado, ''),
                                    '[[:space:]]+',
                                    ' '
                                )
                            )
                        ) AS titulo_norm_match
                FROM titulo_grouplab_clean t
        ) t
            ON (
                    -- Opción 1: Match completo por tipo + año + título (original)
                    (LOWER(TRIM(r.tipo_proyecto)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(t.tipo)) COLLATE utf8mb4_unicode_ci
                     AND COALESCE(CAST(r.anio AS CHAR), '') = COALESCE(t.ano, '')
                     AND (
                                r.titulo_norm_match COLLATE utf8mb4_unicode_ci = t.titulo_norm_match COLLATE utf8mb4_unicode_ci
                                OR (CHAR_LENGTH(t.titulo_norm_match) >= 25 AND r.titulo_norm_match COLLATE utf8mb4_unicode_ci LIKE CONCAT(t.titulo_norm_match COLLATE utf8mb4_unicode_ci, ' %'))
                                OR (CHAR_LENGTH(r.titulo_norm_match) >= 25 AND t.titulo_norm_match COLLATE utf8mb4_unicode_ci LIKE CONCAT(r.titulo_norm_match COLLATE utf8mb4_unicode_ci, ' %'))
                     )
                    )
                    -- Opción 2: Si el título es muy largo (>40 chars) y exacto, permitir match SIN importar año/tipo
                    OR (CHAR_LENGTH(r.titulo_norm_match) >= 40
                        AND r.titulo_norm_match COLLATE utf8mb4_unicode_ci = t.titulo_norm_match COLLATE utf8mb4_unicode_ci
                    )
            )
""")

filas = cur.rowcount
conn.commit()
print(f"✅ Tabla creada con {filas} registros")

print("\n🔧 Agregando PRIMARY KEY...")
cur.execute("""
    ALTER TABLE resultados_coincidentes_materializada
    ADD COLUMN tabla_id INT AUTO_INCREMENT PRIMARY KEY FIRST
""")
conn.commit()

print("🔧 Creando índices...")
cur.execute("CREATE INDEX idx_rcm_tipo_proyecto ON resultados_coincidentes_materializada(tipo_proyecto)")
cur.execute("CREATE INDEX idx_rcm_tipo_grouplab ON resultados_coincidentes_materializada(tipo_grouplab)")
cur.execute("CREATE INDEX idx_rcm_titulo_norm ON resultados_coincidentes_materializada(titulo_normalizado(255))")
cur.execute("CREATE INDEX idx_rcm_anio ON resultados_coincidentes_materializada(anio)")
cur.execute("CREATE INDEX idx_rcm_ano_grouplab ON resultados_coincidentes_materializada(ano_grouplab)")
cur.execute("CREATE INDEX idx_rcm_investigador ON resultados_coincidentes_materializada(id_investigador)")
conn.commit()

print("✅ Índices creados")

cur.execute("SELECT COUNT(*) FROM resultados_coincidentes_materializada")
total = cur.fetchone()[0]
print(f"\n✅ Total de registros en la tabla: {total}")

print("\n📋 Primeros 5 registros:")
cur.execute("""
    SELECT tabla_id, nombre, tipo_proyecto, LEFT(titulo_proyecto, 60), anio
    FROM resultados_coincidentes_materializada
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"  {row[0]}. {row[1]} | {row[2]} | {row[3]}... | {row[4]}")

cur.close()
conn.close()

print("\n✅ Tabla resultados_coincidentes_materializada lista")
