from db_connection import get_connection

conn = get_connection()

cur = conn.cursor()

print("🔄 Creando tabla materializada: resultados + titulo_grouplab_clean")
print("   Criterio: título + tipo + año + facultad")

# =========================================================
# ELIMINAR TABLA ANTERIOR
# =========================================================
cur.execute("DROP TABLE IF EXISTS resultados_coincidentes_materializada")

# =========================================================
# CREAR TABLA MATERIALIZADA CORREGIDA
# =========================================================
cur.execute("""
CREATE TABLE resultados_coincidentes_materializada AS
SELECT
    r.id,

    /* Resolver investigador */
    COALESCE(
        r.id_investigador,
        inv1.id_investigador,
        inv2.id_investigador,
        inv3.id_investigador,
        inv4.id_investigador,
        inv5.id_investigador
    ) AS id_investigador,

    r.nombre,
    r.categoria,
    r.tipo_proyecto,
    r.titulo_proyecto,
    r.nodo_padre AS nodo_padre_resultados,
    r.anio,

    t.id AS id_grouplab,
    t.tipo AS tipo_grouplab,
    t.nodo_padre AS nodo_padre_grouplab,
    t.nombre_grupo_investigacion AS nombre_grupo_grouplab,
    t.sigla_grupo_investigacion AS sigla_grupo_grouplab,
    t.titulo AS titulo_grouplab,
    t.titulo_original AS titulo_original_grouplab,
    t.titulo_normalizado,
    t.autor_1 AS autor_1_grouplab,
    t.autor_2 AS autor_2_grouplab,
    t.autor_3 AS autor_3_grouplab,
    t.autor_4 AS autor_4_grouplab,
    t.autor_5 AS autor_5_grouplab,
    t.issn,
    t.isbn,
    t.revista,
    t.ano AS ano_grouplab,

    lg.id_facultad AS id_facultad_grupo,
    ipf.id_facultad AS id_facultad_investigador,

    'coincidencia_titulo_tipo_ano_facultad' AS coincidencia

FROM (
    SELECT
        r.*,
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
                            '[\r\n\t]+',
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
        t.*,
        LOWER(
            TRIM(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            COALESCE(t.titulo_normalizado, ''),
                            '[\r\n\t]+',
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
    FROM titulo_grouplab_clean t
) t
ON (
    /* OBLIGATORIO: tipo igual */
    CASE
        WHEN LOWER(TRIM(r.tipo_proyecto)) COLLATE utf8mb4_unicode_ci IN (
            'evento artistico',
            'evento artístico',
            'eventos artistico',
            'eventos artisticos',
            'eventos artísticos'
        ) THEN 'eventos artisticos'
        WHEN LOWER(TRIM(r.tipo_proyecto)) COLLATE utf8mb4_unicode_ci IN (
            'redes de conocimiento especializado',
            'redes conocimiento especializado',
            'redes de conocimiento',
            'redes conocimiento'
        ) THEN 'redes conocimiento especializado'
        ELSE LOWER(TRIM(r.tipo_proyecto)) COLLATE utf8mb4_unicode_ci
    END =
    CASE
        WHEN LOWER(TRIM(t.tipo)) COLLATE utf8mb4_unicode_ci IN (
            'evento artistico',
            'evento artístico',
            'eventos artistico',
            'eventos artisticos',
            'eventos artísticos'
        ) THEN 'eventos artisticos'
        WHEN LOWER(TRIM(t.tipo)) COLLATE utf8mb4_unicode_ci IN (
            'redes de conocimiento especializado',
            'redes conocimiento especializado',
            'redes de conocimiento',
            'redes conocimiento'
        ) THEN 'redes conocimiento especializado'
        ELSE LOWER(TRIM(t.tipo)) COLLATE utf8mb4_unicode_ci
    END

    /* OBLIGATORIO: año igual */
    AND COALESCE(CAST(r.anio AS CHAR), '') =
        COALESCE(TRIM(t.ano), '')

    /* OBLIGATORIO: título compatible */
    AND (
        r.titulo_norm_match COLLATE utf8mb4_unicode_ci =
        t.titulo_norm_match COLLATE utf8mb4_unicode_ci

        OR (
            CHAR_LENGTH(t.titulo_norm_match) >= 25
            AND r.titulo_norm_match COLLATE utf8mb4_unicode_ci
            LIKE CONCAT(t.titulo_norm_match COLLATE utf8mb4_unicode_ci, ' %')
        )

        OR (
            CHAR_LENGTH(r.titulo_norm_match) >= 25
            AND t.titulo_norm_match COLLATE utf8mb4_unicode_ci
            LIKE CONCAT(r.titulo_norm_match COLLATE utf8mb4_unicode_ci, ' %')
        )
    )
)

# =========================================================
# MATCH DE AUTORES → INVESTIGADOR
# =========================================================
LEFT JOIN investigadores inv1
    ON LOWER(TRIM(inv1.nombre_completo)) COLLATE utf8mb4_unicode_ci =
       LOWER(TRIM(t.autor_1)) COLLATE utf8mb4_unicode_ci

LEFT JOIN investigadores inv2
    ON LOWER(TRIM(inv2.nombre_completo)) COLLATE utf8mb4_unicode_ci =
       LOWER(TRIM(t.autor_2)) COLLATE utf8mb4_unicode_ci

LEFT JOIN investigadores inv3
    ON LOWER(TRIM(inv3.nombre_completo)) COLLATE utf8mb4_unicode_ci =
       LOWER(TRIM(t.autor_3)) COLLATE utf8mb4_unicode_ci

LEFT JOIN investigadores inv4
    ON LOWER(TRIM(inv4.nombre_completo)) COLLATE utf8mb4_unicode_ci =
       LOWER(TRIM(t.autor_4)) COLLATE utf8mb4_unicode_ci

LEFT JOIN investigadores inv5
    ON LOWER(TRIM(inv5.nombre_completo)) COLLATE utf8mb4_unicode_ci =
       LOWER(TRIM(t.autor_5)) COLLATE utf8mb4_unicode_ci

# =========================================================
# FACULTAD DEL GRUPO
# =========================================================
LEFT JOIN link_grouplab lg
    ON t.id_link_grouplab = lg.id

# =========================================================
# FACULTAD DEL INVESTIGADOR
# =========================================================
LEFT JOIN investigador_programa_facultad ipf
    ON ipf.id_investigador = COALESCE(
        r.id_investigador,
        inv1.id_investigador,
        inv2.id_investigador,
        inv3.id_investigador,
        inv4.id_investigador,
        inv5.id_investigador
    )

# =========================================================
# OBLIGATORIO: FACULTAD IGUAL
# =========================================================
WHERE ipf.id_facultad = lg.id_facultad
""")

conn.commit()
print("✅ Tabla creada")

# =========================================================
# PRIMARY KEY AUTOINCREMENTAL
# =========================================================
print("🔧 Agregando PRIMARY KEY...")

cur.execute("""
ALTER TABLE resultados_coincidentes_materializada
ADD COLUMN tabla_id INT AUTO_INCREMENT PRIMARY KEY FIRST
""")

conn.commit()

# =========================================================
# ÍNDICES
# =========================================================
print("🔧 Creando índices...")

cur.execute("CREATE INDEX idx_rcm_tipo_proyecto ON resultados_coincidentes_materializada(tipo_proyecto)")
cur.execute("CREATE INDEX idx_rcm_tipo_grouplab ON resultados_coincidentes_materializada(tipo_grouplab)")
cur.execute("CREATE INDEX idx_rcm_titulo_norm ON resultados_coincidentes_materializada(titulo_normalizado(255))")
cur.execute("CREATE INDEX idx_rcm_anio ON resultados_coincidentes_materializada(anio)")
cur.execute("CREATE INDEX idx_rcm_ano_grouplab ON resultados_coincidentes_materializada(ano_grouplab)")
cur.execute("CREATE INDEX idx_rcm_investigador ON resultados_coincidentes_materializada(id_investigador)")
cur.execute("CREATE INDEX idx_rcm_id_facultad_grupo ON resultados_coincidentes_materializada(id_facultad_grupo)")
cur.execute("CREATE INDEX idx_rcm_id_facultad_investigador ON resultados_coincidentes_materializada(id_facultad_investigador)")
cur.execute("CREATE INDEX idx_rcm_id_grouplab ON resultados_coincidentes_materializada(id_grouplab)")

conn.commit()
print("✅ Índices creados")

# =========================================================
# TOTAL REGISTROS
# =========================================================
cur.execute("SELECT COUNT(*) FROM resultados_coincidentes_materializada")
total = cur.fetchone()[0]

print(f"\\n✅ Total registros: {total}")

# =========================================================
# REVISAR DUPLICADOS DE GROUPLAB
# =========================================================
print("\\n🔎 Revisando posibles duplicados de Grouplab...")

cur.execute("""
SELECT COUNT(*)
FROM (
    SELECT id_grouplab
    FROM resultados_coincidentes_materializada
    GROUP BY id_grouplab
    HAVING COUNT(*) > 1
) x
""")

duplicados = cur.fetchone()[0]

print(f"⚠️ Grouplab repetidos en múltiples resultados: {duplicados}")

cur.close()
conn.close()

print("\\n🎉 Proceso terminado correctamente.")