from db_connection import get_connection

conn = get_connection()
cur = conn.cursor()

# Revisa valores nulos en nodo_padre_grouplab
cur.execute("SELECT COUNT(*) FROM tabla_normalizada_final WHERE nodo_padre_grouplab IS NULL OR nodo_padre_grouplab = ''")
nulos_grouplab = cur.fetchone()[0]
print(f"Registros con nodo_padre_grouplab nulo o vacío: {nulos_grouplab}")

cur.execute("SELECT tabla_id, nodo_padre_grouplab FROM tabla_normalizada_final WHERE nodo_padre_grouplab IS NULL OR nodo_padre_grouplab = '' LIMIT 10")
for row in cur.fetchall():
    print(row)

# Revisa valores nulos en nodo_padre_resultados
cur.execute("SELECT COUNT(*) FROM tabla_normalizada_final WHERE nodo_padre_resultados IS NULL OR nodo_padre_resultados = ''")
nulos_resultados = cur.fetchone()[0]
print(f"Registros con nodo_padre_resultados nulo o vacío: {nulos_resultados}")

cur.execute("SELECT tabla_id, nodo_padre_resultados FROM tabla_normalizada_final WHERE nodo_padre_resultados IS NULL OR nodo_padre_resultados = '' LIMIT 10")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
