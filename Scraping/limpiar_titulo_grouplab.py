def limpiar_titulo_grouplab():
    from db_connection import get_connection
    conexion = get_connection()
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
