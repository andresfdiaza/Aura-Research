from db_connection import get_connection

def actualizar_id_link_grouplab():
    conexion = get_connection()
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
