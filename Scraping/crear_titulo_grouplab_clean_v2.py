#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import mysql.connector
from collections import defaultdict
import re
import hashlib
import unicodedata

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='Amaamama12345.',
    database='scraping',
    charset='utf8mb4',
    use_unicode=True
)

print("\n" + "=" * 80)
print("DEDUPLICACIÓN AVANZADA: titulo_grouplab_clean (con autores como conjunto)")
print("=" * 80)

# Función para normalizar title (igual que SQL)
def normalize_title(title):
    if not title:
        return ""
    # Trim, collapse spaces, remove newlines
    title = title.replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
    title = re.sub(r'\s+', ' ', title.strip())
    # Remove accents/tildes (NFD normalization)
    title = unicodedata.normalize('NFD', title)
    title = ''.join(char for char in title if unicodedata.category(char) != 'Mn')
    # Remove punctuation and lowercase
    title = title.replace('.', '').replace(',', '').replace(';', '').replace(':', '')
    title = title.lower().strip()
    return title

# Función para extraer set de autores (ignorando orden y espacios)
def get_author_set(autor_cols):
    authors = set()
    for author in autor_cols:
        if author and author.strip():
            authors.add(author.strip())
    return frozenset(authors)  # frozenset = indiferente al orden

# 1) Cargar datos de titulo_grouplab con cursor tupla
print("\n🔄 Cargando datos de titulo_grouplab...")
cur = conn.cursor()
cur.execute("""
SELECT 
    tipo, nodo_padre, titulo, autor_1, autor_2, autor_3, autor_4,
    autor_5, autor_6, autor_7, autor_8, issn, isbn, revista, ano
FROM titulo_grouplab
""")

rows_raw = cur.fetchall()
total_origen = len(rows_raw)
print(f"   ✅ {total_origen} registros cargados")

# 2) Agrupar por tipo + título + año (ignorar autores inicialmente)
print("\n🧹 Identificando duplicados (tipo + título + año, mantener más autores)...")
groups_by_base = defaultdict(list)

for row in rows_raw:
    tipo, nodo_padre, titulo, a1, a2, a3, a4, a5, a6, a7, a8, issn, isbn, revista, ano = row
    
    # Clave base: solo tipo + título normalizado + año
    key_base = (tipo or '', normalize_title(titulo or ''), ano or '')
    
    auto_set = get_author_set([a1, a2, a3, a4, a5, a6, a7, a8])
    
    row_data = {
        'tipo': tipo,
        'nodo_padre': nodo_padre,
        'titulo': titulo,
        'titulo_original': titulo,
        'titulo_normalizado': normalize_title(titulo),
        'autores_set': auto_set,
        'autores_orig': [a1, a2, a3, a4, a5, a6, a7, a8],
        'issn': issn,
        'isbn': isbn,
        'revista': revista,
        'ano': ano
    }
    
    groups_by_base[key_base].append(row_data)

# 3) Para cada grupo, mantener el con más autores (y si hay empate, el con más metadatos)
print(f"   ✅ Grupos (tipo+título+año) encontrados: {len(groups_by_base)}")

def score_completeness(row):
    """Calcula puntuación de completitud de metadatos"""
    score = 0
    if row.get('issn') and row['issn'].strip():
        score += 10
    if row.get('isbn') and row['isbn'].strip():
        score += 10
    if row.get('revista') and row['revista'].strip():
        score += 5
    if row.get('nodo_padre') and row['nodo_padre'].strip():
        score += 3
    return score

def get_deterministic_hash(row):
    """Crear un hash determinístico del registro para desempates"""
    content = f"{row.get('titulo', '')}{row.get('issn', '')}{row.get('isbn', '')}{row.get('revista', '')}"
    return hashlib.md5(content.encode()).hexdigest()

dedup_map = {}
total_eliminados = 0

for key_base, group in groups_by_base.items():
    if len(group) == 1:
        # Sin duplicados
        dedup_map[key_base] = group[0]
    else:
        # Múltiples registros: 
        # 1) Mantener el con MÁS autores
        # 2) Si hay empate, mantener el con MÁS metadatos (issn, isbn, revista)
        # 3) Si aún hay empate, usar el hash determinístico (para elegir consistentemente)
        # 4) Si sigue habiendo empate, mantener EL PRIMERO
        best_idx = 0
        best_score = (
            len(group[0]['autores_set']),
            score_completeness(group[0]),
            get_deterministic_hash(group[0])
        )
        
        for idx, row in enumerate(group[1:], 1):
            row_score = (
                len(row['autores_set']),
                score_completeness(row),
                get_deterministic_hash(row)
            )
            if row_score > best_score:
                best_score = row_score
                best_idx = idx
        
        dedup_map[key_base] = group[best_idx]
        total_eliminados += len(group) - 1

duplicados_count = sum(1 for k, g in groups_by_base.items() if len(g) > 1)
print(f"   ✅ Grupos con duplicados: {duplicados_count}")
print(f"   ✅ Registros a eliminar: {total_eliminados}")

# 4) Mostrar ejemplos
print(f"\n📋 TOP 5 Duplicados (mejor = más autores + más metadatos + hash desempate):\n")
for i, (key_base, group) in enumerate(sorted(groups_by_base.items(), key=lambda x: -len(x[1]))[:5], 1):
    if len(group) > 1:
        tipo, titulo_norm, ano = key_base
        titulo_original = group[0]['titulo']
        titulo_corto = titulo_original[:60] + '...' if len(titulo_original) > 60 else titulo_original
        
        print(f"{i}. {len(group)} registros - {tipo} ({ano})")
        print(f"   Título: {titulo_corto}")
        
        # Encontrar el mejor índice (mismo criterio)
        best_idx = 0
        best_score = (
            len(group[0]['autores_set']),
            score_completeness(group[0]),
            get_deterministic_hash(group[0])
        )
        
        for idx, row in enumerate(group[1:], 1):
            row_score = (
                len(row['autores_set']),
                score_completeness(row),
                get_deterministic_hash(row)
            )
            if row_score > best_score:
                best_score = row_score
                best_idx = idx
        
        # Mostrar cada copia con puntuación
        for j, row in enumerate(group):
            author_count = len(row['autores_set'])
            metadata_score = score_completeness(row)
            author_order = [a for a in row['autores_orig'] if a and a.strip()]
            is_best = " ← MANTIENE" if j == best_idx else " (elimina)"
            print(f"      Copia {j+1}: {author_count} autores, metadata={metadata_score}{is_best}")
            if author_order:
                print(f"             {author_order}")
        print()

# 4) Crear tabla limpia en BD
print("\n💾 Creando tabla titulo_grouplab_clean...")
cur.execute("DROP TABLE IF EXISTS titulo_grouplab_clean")
cur.execute("""
CREATE TABLE titulo_grouplab_clean (
    tipo VARCHAR(255),
    nodo_padre VARCHAR(255),
    titulo LONGTEXT,
    titulo_original LONGTEXT,
    titulo_normalizado LONGTEXT,
    autor_1 VARCHAR(255),
    autor_2 VARCHAR(255),
    autor_3 VARCHAR(255),
    autor_4 VARCHAR(255),
    autor_5 VARCHAR(255),
    autor_6 VARCHAR(255),
    autor_7 VARCHAR(255),
    autor_8 VARCHAR(255),
    issn VARCHAR(50),
    isbn VARCHAR(50),
    revista VARCHAR(255),
    ano VARCHAR(10),
    INDEX idx_tgc_tipo (tipo),
    INDEX idx_tgc_nodo_padre (nodo_padre),
    INDEX idx_tgc_ano (ano),
    INDEX idx_tgc_titulo_norm (titulo_normalizado(255))
)
""")
conn.commit()

# Insertar 1 registro por grupo (los duplicados los descarta)
print("   Insertando registros únicos...")
rows_to_insert = []
for row in dedup_map.values():
    rows_to_insert.append((
        row['tipo'],
        row['nodo_padre'],
        row['titulo'],
        row['titulo_original'],
        row['titulo_normalizado'],
        row['autores_orig'][0] if len(row['autores_orig']) > 0 else None,
        row['autores_orig'][1] if len(row['autores_orig']) > 1 else None,
        row['autores_orig'][2] if len(row['autores_orig']) > 2 else None,
        row['autores_orig'][3] if len(row['autores_orig']) > 3 else None,
        row['autores_orig'][4] if len(row['autores_orig']) > 4 else None,
        row['autores_orig'][5] if len(row['autores_orig']) > 5 else None,
        row['autores_orig'][6] if len(row['autores_orig']) > 6 else None,
        row['autores_orig'][7] if len(row['autores_orig']) > 7 else None,
        row['issn'],
        row['isbn'],
        row['revista'],
        row['ano']
    ))

# Insert en batches
batch_size = 100
for i in range(0, len(rows_to_insert), batch_size):
    batch = rows_to_insert[i:i+batch_size]
    cur.executemany("""
        INSERT INTO titulo_grouplab_clean 
        (tipo, nodo_padre, titulo, titulo_original, titulo_normalizado,
         autor_1, autor_2, autor_3, autor_4, autor_5, autor_6, autor_7, autor_8,
         issn, isbn, revista, ano)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, batch)
    conn.commit()
    print(f"   ... {min(i + batch_size, len(rows_to_insert))} / {len(rows_to_insert)}")

# Validación final
cur.execute("SELECT COUNT(*) FROM titulo_grouplab_clean")
total_clean = cur.fetchone()[0]

print("\n" + "=" * 80)
print("RESUMEN")
print("=" * 80)
print(f"📊 Registros origen: {total_origen}")
print(f"📊 Registros clean:  {len(dedup_map)}")
print(f"🧹 Duplicados eliminados: {total_eliminados}")
print(f"\n✅ Tabla titulo_grouplab_clean lista para JOIN")
print("=" * 80 + "\n")

cur.close()
conn.close()
