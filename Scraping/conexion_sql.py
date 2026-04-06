from db_connection import get_connection

def limpiar_tabla():
    conexion = get_connection()
    cursor = conexion.cursor()
    # cursor.execute("TRUNCATE TABLE resultados")  # Eliminado para no borrar los datos
    conexion.commit()
    cursor.close()
    conexion.close()
    print("🗑️ Tabla limpiada correctamente")

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
    for fila in datos:
        cursor.execute("""
            SELECT COUNT(*) FROM resultados
            WHERE id_investigador = %s AND titulo_proyecto = %s AND nodo_padre = %s AND anio = %s
        """, (fila.get("id_investigador"), fila["titulo_proyecto"], fila.get("nodo_padre", ""), fila["anio"]))
        existe = cursor.fetchone()[0]
        if existe == 0:
            cursor.execute("""
                INSERT INTO resultados
                (id_investigador, categoria, nombre, sexo, grado, tipo_proyecto, nodo_padre, titulo_proyecto, anio)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                fila.get("id_investigador"),
                fila["categoria"],
                fila["nombre"],
                fila["sexo"],
                fila["grado"],
                fila["tipo_proyecto"],
                fila.get("nodo_padre", ""),
                fila["titulo_proyecto"],
                fila["anio"]
            ))
            nuevos += 1
    conexion.commit()
    cursor.close()
    conexion.close()
    print(f"✅ Se insertaron {nuevos} registros nuevos correctamente")
