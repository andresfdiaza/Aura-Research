def limpiar_titulo_grouplab():
    import mysql.connector
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
        cursor.execute("DELETE FROM titulo_grouplab;")
        conexion.commit()
        print("✓ Tabla titulo_grouplab limpiada.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conexion.close()

if __name__ == "__main__":
    limpiar_titulo_grouplab()
