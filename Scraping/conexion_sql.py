import mysql.connector

def limpiar_tabla():
    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        #host="ingenieria.unac.edu.co",
        #user="investiga",
        password="Amaamama12345.",
        database="scraping",
        charset='utf8mb4',
        use_unicode=True
    )
    cursor = conexion.cursor()
    # cursor.execute("TRUNCATE TABLE resultados")  # Eliminado para no borrar los datos
    conexion.commit()
    cursor.close()
    conexion.close()
    print("🗑️ Tabla limpiada correctamente")

def asegurar_columna_nodo_padre():
    """Agrega la columna nodo_padre si no existe en la tabla resultados"""
    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Amaamama12345.",
        database="scraping",
        charset='utf8mb4',
        use_unicode=True
    )
    cursor = conexion.cursor()
    try:
        # Primero, crear la tabla si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS resultados (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_investigador INT,
                categoria VARCHAR(255),
                nombre VARCHAR(255),
                sexo VARCHAR(50),
                grado VARCHAR(255),
                tipo_proyecto VARCHAR(255),
                nodo_padre VARCHAR(255),
                titulo_proyecto TEXT,
                anio INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        """)
        conexion.commit()
        
        # Verificar si la columna existe
        cursor.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='resultados' AND COLUMN_NAME='nodo_padre' AND TABLE_SCHEMA='scraping'"
        )
        existe = cursor.fetchone()
        
        if not existe:
            # Agregar la columna si no existe
            cursor.execute("ALTER TABLE resultados ADD COLUMN nodo_padre VARCHAR(255)")
            conexion.commit()
            print("✅ Columna 'nodo_padre' agregada a la tabla resultados")
        else:
            print("✅ Columna 'nodo_padre' ya existe en la tabla resultados")
    except Exception as e:
        print(f"⚠️ Error verificando/agregando columna nodo_padre: {e}")
    finally:
        cursor.close()
        conexion.close()

def guardar_en_mysql(datos):

    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        #host="ingenieria.unac.edu.co",
        #user="investiga",
        password="Amaamama12345.",
        database="scraping",
        charset='utf8mb4',
        use_unicode=True
    )

    cursor = conexion.cursor()
    nuevos = 0
    for fila in datos:
        cursor.execute("""
            SELECT COUNT(*) FROM resultados
            WHERE id_investigador = %s AND titulo_proyecto = %s
        """, (fila.get("id_investigador"), fila["titulo_proyecto"]))
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
