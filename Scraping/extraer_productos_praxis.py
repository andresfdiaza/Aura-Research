
import requests
from bs4 import BeautifulSoup
import csv
import re

URL = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000008642"
OUTPUT = "praxis_musical_productos.csv"

# Columnas igual que guardar_csv
COLUMNAS = [
    "tipo", "nodo_padre", "nombre_grupo_investigacion", "sigla_grupo_investigacion", "titulo",
    "autor_1", "autor_2", "autor_3", "autor_4", "autor_5", "issn", "isbn", "revista", "ano"
]

def obtener_info_grupo(soup):
    encabezado = soup.find("span", class_="celdaEncabezado")
    if not encabezado:
        return {"nombre_grupo": "", "sigla_grupo": ""}
    nombre_grupo = encabezado.get_text(" ", strip=True)
    nombre_grupo = re.sub(r"\s+", " ", nombre_grupo).strip()
    sigla_match = re.search(r"\b([A-Z][A-Z0-9]{1,})\b$", nombre_grupo)
    sigla_grupo = sigla_match.group(1) if sigla_match else ""
    return {"nombre_grupo": nombre_grupo, "sigla_grupo": sigla_grupo}

def extraer_autores(texto):
    match = re.search(r"Autores:\s*([^-\n]+)", texto, re.IGNORECASE)
    if match:
        autores = [a.strip() for a in match.group(1).split(",") if a.strip()]
        return autores[:5] + [""] * (5 - len(autores[:5]))
    return ["", "", "", "", ""]

def extraer_ano(texto):
    match = re.search(r"\b(19|20)\d{2}\b", texto)
    return match.group(0) if match else ""

def extraer_issn(texto):
    match = re.search(r"ISSN:\s*([\d-]+)", texto)
    return match.group(1) if match else ""

def extraer_isbn(texto):
    match = re.search(r"ISBN:\s*([\d-]+)", texto)
    return match.group(1) if match else ""

def extraer_revista(texto):
    match = re.search(r',\s*([^,]+?)\s+ISSN:', texto)
    return match.group(1).strip() if match else ""

def normalizar_tipo(seccion):
    # Mapeo mínimo para Praxis Musical
    if "Obras" in seccion:
        return "Obras o productos"
    if "Eventos" in seccion:
        return "Eventos Artísticos"
    if "Curso" in seccion:
        return "Curso de Corta Duración Dictados"
    if "Trabajos" in seccion:
        return "Trabajos dirigidos/turorías"
    return seccion

def obtener_nodo_padre(tipo):
    # Mapeo mínimo para Praxis Musical
    if tipo == "Obras o productos":
        return "Nuevo Conocimiento"
    if tipo == "Eventos Artísticos":
        return "Divulgación Pública de la Ciencia"
    if tipo == "Curso de Corta Duración Dictados":
        return "Formación del Recurso Humano"
    if tipo == "Trabajos dirigidos/turorías":
        return "Formación del Recurso Humano"
    return ""

response = requests.get(URL)
response.encoding = 'latin-1'
soup = BeautifulSoup(response.text, "html.parser")
info_grupo = obtener_info_grupo(soup)

filas_csv = []

for tabla in soup.find_all("table", style=lambda x: x and "border:#999 1px solid" in x):
    encabezado = tabla.find("td", class_="celdaEncabezado", colspan="2")
    if not encabezado:
        continue
    nombre_seccion = encabezado.get_text(strip=True)
    tipo = normalizar_tipo(nombre_seccion)
    nodo_padre = obtener_nodo_padre(tipo)
    for fila in tabla.find_all("tr")[1:]:
        celda = None
        for td in fila.find_all("td"):
            if td.find("strong") or td.find("b"):
                celda = td
                break
        if not celda:
            celdas = fila.find_all("td")
            if celdas:
                celda = celdas[-1]
        if not celda:
            continue
        texto = celda.get_text(" ", strip=True)
        titulo = texto.split("Autores:")[0].strip().strip(':').strip()
        autores = extraer_autores(texto)
        issn = extraer_issn(texto)
        isbn = extraer_isbn(texto)
        revista = extraer_revista(texto)
        ano = extraer_ano(texto)
        fila_csv = [
            tipo,
            nodo_padre,
            info_grupo["nombre_grupo"],
            info_grupo["sigla_grupo"],
            titulo,
            *autores,
            issn,
            isbn,
            revista,
            ano
        ]
        filas_csv.append(fila_csv)

with open(OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(COLUMNAS)
    for fila in filas_csv:
        writer.writerow(fila)

print(f"Extraídos {len(filas_csv)} productos de las secciones clave. Guardado en {OUTPUT}")
