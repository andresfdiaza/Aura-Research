import sys
import time
from pathlib import Path

# Reutiliza la conexión central del proyecto para evitar duplicación de credenciales.
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from Scraping.db_connection import get_connection


def conectar():
    return get_connection()


def ensure_table():
    """Crea la tabla con la estructura de scraping si no existe."""
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS investigadores (
        id_investigador INT AUTO_INCREMENT PRIMARY KEY,
        nombre_completo VARCHAR(255) NOT NULL,
        link_cvlac VARCHAR(255) NOT NULL,
        estado VARCHAR(20) DEFAULT 'pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
    """)
    conn.commit()
    cursor.close()
    conn.close()


def obtener_investigadores():
    """Retorna lista de diccionarios de investigadores pendientes."""
    conn = conectar()
    cursor = conn.cursor(dictionary=True)
    # usamos COALESCE para compatibilidad con tablas antiguas
    cursor.execute(
        """
        SELECT 
            id_investigador,
            nombre_completo AS nombre,
            link_cvlac AS link
        FROM investigadores
        WHERE estado = 'pendiente' OR estado IS NULL
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def marcar_completado(id_investigador):
    conn = conectar()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE investigadores SET estado = 'procesado' WHERE id_investigador = %s",
            (id_investigador,)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def hacer_scraping(link):
    """Función de ejemplo que hace scraping usando la URL y devuelve datos.
    Reemplazar por lógica real.
    """
    print(f"Haciendo scraping de {link}")
    # simulamos trabajo
    time.sleep(1)
    # aquí podrías reutilizar código de `scraping_cvlac_completo` si lo deseas
    return True


def main():
    try:
        ensure_table()
        investigadores = obtener_investigadores()
    except Exception as e:
        print("Error preparando a los investigadores:", e)
        sys.exit(1)

    for inv in investigadores:
        try:
            hacer_scraping(inv['link'])
        except Exception as e:
            print(f"Error scraping {inv['id_investigador']}: {e}")
            continue
        try:
            marcar_completado(inv['id_investigador'])
        except Exception as e:
            print(f"Error actualizando estado {inv['id_investigador']}: {e}")

    print("Proceso de scraping finalizado")


if __name__ == '__main__':
    main()
