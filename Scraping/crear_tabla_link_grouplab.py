import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Amaamama12345.',
    database='scraping',
    charset='utf8mb4',
    use_unicode=True
)

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
