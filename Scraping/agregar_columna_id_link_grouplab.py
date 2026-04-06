from db_connection import get_connection

def agregar_columna_id_link_grouplab():
    conexion = get_connection()
    cursor = conexion.cursor()
    try:
        # Verificar si la columna existe
        cursor.execute("SHOW COLUMNS FROM titulo_grouplab_clean LIKE 'id_link_grouplab';")
        result = cursor.fetchone()
        if not result:
            cursor.execute("ALTER TABLE titulo_grouplab_clean ADD COLUMN id_link_grouplab INT;")
            print("Columna id_link_grouplab agregada.")
        else:
            print("La columna id_link_grouplab ya existe.")
        # Verificar si la llave foránea existe
        cursor.execute("SHOW CREATE TABLE titulo_grouplab_clean;")
        create_table_sql = cursor.fetchone()[1]
        if 'FOREIGN KEY (`id_link_grouplab`)' not in create_table_sql:
            try:
                cursor.execute("ALTER TABLE titulo_grouplab_clean ADD CONSTRAINT fk_id_link_grouplab FOREIGN KEY (id_link_grouplab) REFERENCES link_grouplab(id);")
                print("Llave foránea agregada.")
            except Exception as e:
                print(f"No se pudo agregar la llave foránea: {e}")
        else:
            print("La llave foránea ya existe.")
        conexion.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conexion.close()

if __name__ == "__main__":
    agregar_columna_id_link_grouplab()
