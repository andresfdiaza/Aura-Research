from db_connection import get_connection

conn = get_connection()

cur = conn.cursor()


cur.execute("""
CREATE TABLE IF NOT EXISTS link_grouplab (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(512) NOT NULL,
    id_facultad INT,
    FOREIGN KEY (id_facultad) REFERENCES facultad(id_facultad)
) ENGINE=InnoDB;
""")

conn.commit()
cur.close()
conn.close()

print("✅ Tabla link_grouplab creada o asegurada.")
