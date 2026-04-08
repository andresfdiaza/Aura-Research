from db_connection import get_connection

def limpiar_tabla():
    conexion = get_connection()
    cursor = conexion.cursor()
    # Mantenemos la función para uso manual, pero no debe llamarse en ejecuciones incrementales.
    cursor.execute("TRUNCATE TABLE resultados")
    conexion.commit()
    cursor.close()
    conexion.close()
    print("🗑️ Tabla limpiada correctamente")

def asegurar_indice_unico_resultados():
    """Asegura índice de deduplicación por investigador + producto."""
    conexion = get_connection()
    cursor = conexion.cursor()
    try:
        # Retirar índice de estrategia anterior, si existe.
        cursor.execute("""
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'resultados'
              AND INDEX_NAME = 'uq_resultados_origen'
        """)
        existe_antiguo = cursor.fetchone()[0]
        if existe_antiguo:
            cursor.execute("DROP INDEX uq_resultados_origen ON resultados")
            conexion.commit()
            print("✅ Índice antiguo 'uq_resultados_origen' eliminado")

        cursor.execute("""
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'resultados'
              AND INDEX_NAME = 'uq_resultados_dedupe'
        """)
        existe = cursor.fetchone()[0]

        if existe == 0:
            cursor.execute("""
                CREATE UNIQUE INDEX uq_resultados_dedupe
                ON resultados (id_investigador, titulo_proyecto(255), nodo_padre(255), anio)
            """)
            conexion.commit()
            print("✅ Índice único por investigador creado en resultados")
        else:
            print("✅ Índice único por investigador ya existe en resultados")
    except Exception as e:
        print(f"⚠️ Error al asegurar índice único en resultados: {e}")
    finally:
        cursor.close()
        conexion.close()

def asegurar_columna_nodo_padre():
    """Agrega la columna nodo_padre si no existe en la tabla resultados"""
    conexion = get_connection()
    cursor = conexion.cursor()
    try:
            # Primero, crear la tabla si no existe
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS link_grouplab (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    url VARCHAR(512),
                    id_facultad INT,
                    nombre_grupo VARCHAR(255),
                    sigla_grupo VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB
            """)
            conexion.commit()
            
            # Verificar si la columna existe
            cursor.execute(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='link_grouplab' AND COLUMN_NAME='sigla_grupo' AND TABLE_SCHEMA='scraping'"
            )
            existe = cursor.fetchone()
            
            if not existe:
                # Agregar la columna si no existe
                cursor.execute("ALTER TABLE link_grouplab ADD COLUMN sigla_grupo VARCHAR(255)")
                conexion.commit()
                print("✅ Columna 'sigla_grupo' agregada a la tabla link_grouplab")
            else:
                print("✅ Columna 'sigla_grupo' ya existe en la tabla link_grouplab")
    except Exception as e:
        print(f"⚠️ Error verificando/agregando columna sigla_grupo: {e}")
    finally:
        cursor.close()
        conexion.close()
        
def guardar_en_mysql(datos):

    conexion = get_connection()

    cursor = conexion.cursor()

    nuevos = 0
    omitidos = 0
    for fila in datos:
        id_investigador = fila.get("id_investigador")
        titulo = fila.get("titulo_proyecto", "")
        nodo_padre = fila.get("nodo_padre", "")
        anio = fila.get("anio", "")

        if id_investigador is not None:
            cursor.execute("""
                SELECT COUNT(*)
                FROM resultados
                WHERE id_investigador = %s
                  AND titulo_proyecto = %s
                  AND nodo_padre = %s
                  AND anio = %s
            """, (id_investigador, titulo, nodo_padre, anio))
            existe = cursor.fetchone()[0]
            if existe:
                omitidos += 1
                continue

        cursor.execute("""
            INSERT INTO resultados
            (id_investigador, categoria, nombre, sexo, grado, tipo_proyecto, nodo_padre, titulo_proyecto, anio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            id_investigador,
            fila["categoria"],
            fila["nombre"],
            fila["sexo"],
            fila["grado"],
            fila["tipo_proyecto"],
            nodo_padre,
            titulo,
            anio
        ))
        nuevos += 1
    conexion.commit()
    cursor.close()
    conexion.close()
    print(f"✅ Operación incremental completada. Nuevos: {nuevos}")
    print(f"ℹ️ Omitidos por duplicado del mismo investigador: {omitidos}")
