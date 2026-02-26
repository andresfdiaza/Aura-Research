import mysql.connector

def limpiar_tabla():
    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        #host="ingenieria.unac.edu.co",
        #user="investiga",
        password="Amaamama12345.",
        database="scraping"
    )
    cursor = conexion.cursor()
    cursor.execute("TRUNCATE TABLE resultados")
    conexion.commit()
    cursor.close()
    conexion.close()
    print("🗑️ Tabla limpiada correctamente")

def guardar_en_mysql(datos):

    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        #host="ingenieria.unac.edu.co",
        #user="investiga",
        password="Amaamama12345.",
        database="scraping"
    )

    cursor = conexion.cursor()

    # ensure the resultados table has an id_investigador column when scraping
    sql = """
    INSERT INTO resultados
    (id_investigador, categoria, nombre, sexo, grado, tipo_proyecto, titulo_proyecto, anio)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """

    valores = [
        (
            fila.get("id_investigador"),
            fila["categoria"],
            fila["nombre"],
            fila["sexo"],
            fila["grado"],
            fila["tipo_proyecto"],
            fila["titulo_proyecto"],
            fila["anio"]
        )
        for fila in datos
    ]

    cursor.executemany(sql, valores)
    conexion.commit()
    cursor.close()
    conexion.close()

    print(f"✅ Se insertaron {len(valores)} registros")