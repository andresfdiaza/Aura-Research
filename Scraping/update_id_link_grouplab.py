import mysql.connector

def actualizar_id_link_grouplab():
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
        update_sql = '''
        UPDATE titulo_grouplab tg
        JOIN link_grouplab lg
          ON CONVERT(tg.nombre_grupo_investigacion USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(lg.nombre_grupo USING utf8mb4) COLLATE utf8mb4_unicode_ci
          AND CONVERT(tg.sigla_grupo_investigacion USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(lg.sigla_grupo USING utf8mb4) COLLATE utf8mb4_unicode_ci
        SET tg.id_link_grouplab = lg.id
        WHERE tg.id_link_grouplab IS NULL;
        '''
        cursor.execute(update_sql)
        conexion.commit()
        print("✓ id_link_grouplab actualizado para registros NULL en titulo_grouplab.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conexion.close()

if __name__ == "__main__":
    actualizar_id_link_grouplab()
