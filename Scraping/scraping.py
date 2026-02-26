import mysql.connector
import os
import sys
import time

# carga variables de entorno si existen
from dotenv import load_dotenv
# cargar variables de entorno del directorio backend (el script se ejecuta desde allí)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', ''),
    'database': os.getenv('DB_NAME', 'scraping'),
}


def conectar():
    return mysql.connector.connect(**DB_CONFIG)


def ensure_table():
    """Crea la tabla con la estructura de scraping si no existe."""
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS investigadores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        link TEXT NOT NULL,
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
            id,
            COALESCE(nombre, nombre_completo) AS nombre,
            COALESCE(link, link_cvlac) AS link
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
            "UPDATE investigadores SET estado = 'procesado' WHERE id = %s",
            (id_investigador,)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def hacer_scraping(link):
    """Wrapper that delegates to the complete scraping module.
    The real extraction code lives in `scraping_cvlac_completo.py`.
    Calling this function manually is no longer necessary; the Node.js
    service now executes `scraping_cvlac_completo.py` directly.  However
    the helper remains for backwards compatibility if someone imports this
    file.
    """
    try:
        # import lazily to avoid circular import on module load
        from scraping_cvlac_completo import main as completo_main
        # `main` expects to iterate all pending URLs internally so we
        # ignore the `link` argument here and just run the full job.
        completo_main()
        return True
    except Exception as e:
        print("Error delegating scraping:", e)
        return False


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
            print(f"Error scraping {inv['id']}: {e}")
            continue
        try:
            marcar_completado(inv['id'])
        except Exception as e:
            print(f"Error actualizando estado {inv['id']}: {e}")

    print("Proceso de scraping finalizado")


if __name__ == '__main__':
    main()
