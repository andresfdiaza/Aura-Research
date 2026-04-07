import html
import sys
import requests  #sirve para hacer solicitudes HTTP
import csv  # sirve para escribir archivos CSV
import re # busca patrones en el texto y extraer información específica y reducir espacios extra
import time
from bs4 import BeautifulSoup
import os
import unicodedata
from conexion_sql import guardar_en_mysql, limpiar_tabla, asegurar_columna_nodo_padre
from db_connection import get_connection

from conexion_sql import guardar_en_mysql

# la variable global se mantiene para compatibilidad con el resto del código
URL = ""

# en lugar de escribir manualmente las URL vamos a leerlas desde la tabla
# `investigadores` de MySQL; sacamos el campo `link_cvlac`
# y sólo procesamos aquellos con estado 'pendiente'.

def obtener_urls_db():
    # return list of (id, url) so we can record which investigador each result
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id_investigador, link_cvlac FROM investigadores WHERE estado='pendiente' AND link_cvlac IS NOT NULL"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    # filter out any empty urls and keep their associated id
    return [(r[0], r[1]) for r in rows if r[1]]


def marcar_todos_pendientes():
    """Marca como 'pendiente' todos los investigadores que tengan un link.
    Esto asegura que cada ejecución procese todas las entradas con URL.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE investigadores SET estado = 'pendiente' WHERE link_cvlac IS NOT NULL"
    )
    conn.commit()
    cur.close()
    conn.close()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-CO,es;q=0.9",
    "Referer": "https://scienti.minciencias.gov.co/",
    "Connection": "keep-alive"
}
# Nota: El sitio de CVLAC puede bloquear solicitudes si detecta tráfico sospechoso.
# Por ende se usa el headers para simular un navegador real
# y se implementan reintentos con espera entre ellos.

# Mapeo de NodoHijo (scraping) -> NodoPadre (TipologiaProductos)
NODO_PADRE_MAP = {
    "Artículo": "Nuevo Conocimiento",
    "Libro": "Nuevo Conocimiento",
    "Capítulos de libro": "Nuevo Conocimiento",
    "Otra producción bibliográfica": "Divulgación Pública de la Ciencia",
    "Patente": "Nuevo Conocimiento",
    "Software": "Desarrollo Tecnológico e Innovación",
    "Otros productos tecnológicos": "Desarrollo Tecnológico e Innovación",
    "Prototipo industrial": "Desarrollo Tecnológico e Innovación",
    "Secreto empresarial": "Desarrollo Tecnológico e Innovación",
    "Innovaciones generadas de producción empresarial": "Desarrollo Tecnológico e Innovación",
    "Innovación de proceso o procedimiento": "Desarrollo Tecnológico e Innovación",
    "Concepto técnico": "Desarrollo Tecnológico e Innovación",
    "Proceso de Apropiación Social del Conocimiento para el fortalecimiento o solución de asuntos de interés social": "Apropiación Social del Conocimiento",
    "Proceso de Apropiación Social del Conocimiento para la generación de insumos de política pública y normatividad": "Apropiación Social del Conocimiento",
    "Proceso de Apropiación Social del Conocimiento para el fortalecimiento de cadenas": "Apropiación Social del Conocimiento",
    "Evento científico": "Divulgación Pública de la Ciencia",
    "Documento de trabajo": "Divulgación Pública de la Ciencia",
    "Textos en publicaciones no científicas": "Divulgación Pública de la Ciencia",
    "Informes finales de investigación": "Divulgación Pública de la Ciencia",
    "Informe técnico": "Divulgación Pública de la Ciencia",
    "Consultoría Científico Tecnológica e Informe Técnico": "Divulgación Pública de la Ciencia",
    "Producción de estrategias y contenidos transmedia": "Divulgación Pública de la Ciencia",
    "Desarrollos web": "Divulgación Pública de la Ciencia",
    "Trabajo dirigido de doctorado": "Formación del Recurso Humano",
    "Trabajo de grado de maestría o especialidad clínica": "Formación del Recurso Humano",
    "Trabajos de grado de pregrado": "Formación del Recurso Humano",
    "Investigación y desarrollo": "Formación del Recurso Humano",
    "Investigación-Creación": "Formación del Recurso Humano",
    "Investigación desarrollo e Innovación": "Formación del Recurso Humano",
    "Extensión y responsabilidad social CTI": "Formación del Recurso Humano",
    "Trabajo dirigido de conclusión de curso de perfeccionamiento/especialización": "Formación del Recurso Humano",
    "Trabajos dirigidos/Tutorías de otro tipo": "Formación del Recurso Humano",
    "Monografía de conclusión de curso de perfeccionamiento/especialización": "Formación del Recurso Humano",
    "Tesis de doctorado": "Formación del Recurso Humano",
    "Reglamento Técnico": "Desarrollo Tecnológico e Innovación",
    "redes conocimiento especializado": "Divulgación Pública de la Ciencia",
    "contenido impreso": "Divulgación Pública de la Ciencia",
    "contenido multimedia": "Divulgación Pública de la Ciencia",
    "contenido virtual": "Divulgación Pública de la Ciencia",
    "estrategias comunicacion conocimiento": "Divulgación Pública de la Ciencia",
    "estrategias pedagogicas cti": "Divulgación Pública de la Ciencia",
    "participacion ciudadana cti": "Divulgación Pública de la Ciencia",
    "Obras o productos": "Nuevo Conocimiento",
    "Ediciones/revisiones": "Divulgación Pública de la Ciencia",
    "Eventos artisticos": "Divulgación Pública de la Ciencia",
    "Evento artístico": "Divulgación Pública de la Ciencia",
    "Redes de conocimiento especializado": "Divulgación Pública de la Ciencia",
    "Producciones de contenido digital - Audiovisuales - Cápsulas de video": "Divulgación Pública de la Ciencia",
}

def obtener_nodo_padre(nodo_hijo):
    """Busca el nodo padre basado en el nodo hijo (case-insensitive)"""
    if not nodo_hijo:
        return ""
    nodo_normalizado = nodo_hijo.strip()
    return NODO_PADRE_MAP.get(nodo_normalizado, "")

archivo_csv = "cv_datos_generales.csv"


# Borra el archivo si ya existe
if os.path.exists(archivo_csv):
    os.remove(archivo_csv)

def quitar_tildes(texto):
    """Mantiene tildes y ñ, solo hace limpieza de encoding"""
    if not texto:
        return ""
    # Solo normaliza el encoding, NO quita tildes
    if isinstance(texto, bytes):
        texto = texto.decode('utf-8', errors='replace')
    texto = unicodedata.normalize("NFC", texto)
    return texto

def reparar_mojibake(texto):
    """Repara texto mal decodificado (ej: investigaciÃ³n -> investigación)."""
    if not texto or not isinstance(texto, str):
        return texto

    # Señales típicas de UTF-8 mal interpretado
    patron_mojibake = r"[ÃÂâ]|\uFFFD"
    if not re.search(patron_mojibake, texto):
        return texto

    def puntaje(cadena):
        # Menor puntaje = texto más limpio
        return len(re.findall(patron_mojibake, cadena))

    mejor = texto
    mejor_puntaje = puntaje(texto)

    # Probar reparaciones con latin-1 y cp1252
    for encoding in ("latin-1", "cp1252"):
        for modo_error in ("strict", "replace"):
            try:
                candidato = texto.encode(encoding, errors=modo_error).decode("utf-8", errors="replace")
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue

            p = puntaje(candidato)
            if p < mejor_puntaje:
                mejor = candidato
                mejor_puntaje = p

    return mejor

def limpiar(texto):
    if not texto:
        return ""
    if isinstance(texto, bytes):
        texto = texto.decode("utf-8", errors="replace")
    texto = reparar_mojibake(texto)
    # Decodificar entidades HTML (&aacute;, &ntilde;, etc.)
    texto = html.unescape(texto)
    texto = unicodedata.normalize("NFC", texto)
    texto = texto.replace("\xa0", " ")
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()
# La función limpiar se encarga de eliminar espacios extra y caracteres
# no deseados del texto extraído.
def limpiar_titulo(titulo):
    """
    Limpia espacios, comillas y reemplaza comas internas por punto y coma.
    Mantiene tildes y ñ.
    """
    if not titulo:
        return ""
    titulo = quitar_tildes(titulo)        # Normaliza encoding
    titulo = titulo.replace('"', '')      # Quita comillas dobles
    titulo = titulo.replace("'", '')      # Quita comillas simples
    titulo = titulo.replace(",", ";")     # Reemplaza comas internas
    titulo = titulo.strip()               # Quita espacios al inicio y al final
    return titulo
def limpiar_categoria(texto):
    if not texto:
        return ""

    match = re.search(
        r"(Investigador\s+(Junior|Asociado|Senior))",
        texto,
        re.IGNORECASE
    )

    if match:
        return match.group(1).title()

    return texto.strip()

def limpiar_tipo_trabajo(texto):
    if not texto:
        return ""

    texto = limpiar(texto)

    # Nos quedamos SOLO con lo que está después del "-"
    # Ej: "Trabajos dirigidos/Tutorías - Trabajos de grado de pregrado" → "Trabajos de grado de pregrado"
    # Ej: "Trabajos dirigidos/Tutorías - Trabajo de grado de maestría o especialidad clínica" → "Trabajo de grado de maestría o especialidad clínica"
    if "-" in texto:
        texto = texto.split("-", 1)[1].strip()
    
    return texto

def limpiar_tipo_consultoria(texto):
    texto = limpiar(texto)

    if "-" in texto:
        texto = texto.split("-", 1)[1].strip()

    return texto


def obtener_html():
    session = requests.Session()
    session.headers.update(HEADERS)

    for intento in range(5):
        print(f"Intento {intento + 1} de conexión...")
        try:
            # Aumentar timeout a 60 segundos para servidores lentos
            response = session.get(URL, timeout=60)

            if response.status_code == 200:
                # Decodificación robusta para evitar mojibake en tildes/ñ
                encodings = [
                    response.encoding,
                    response.apparent_encoding,
                    "utf-8",
                    "latin-1",
                ]
                html_content = None

                for enc in [e for e in encodings if e]:
                    try:
                        html_content = response.content.decode(enc, errors="strict")
                        break
                    except UnicodeDecodeError:
                        continue

                if html_content is None:
                    html_content = response.content.decode("utf-8", errors="replace")

                html_content = reparar_mojibake(html_content)
                return html_content

            print(f"Servidor respondió {response.status_code}, esperando...")
            time.sleep(5)
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout) as e:
            print(f"Error de conexión (intento {intento + 1}): {str(e)}")
            if intento < 4:
                espera = 10 + (intento * 5)  # Espera progresiva: 10s, 15s, 20s, 25s
                print(f"Esperando {espera} segundos antes de reintentar...")
                time.sleep(espera)
            else:
                raise

    raise Exception("No fue posible acceder a CVLAC (bloqueo del servidor después de 5 intentos)")
# La función obtener_html intenta obtener el HTML de la página con reintentos y espera

#================================================
# EXTRAER DATOS GENERALES
#================================================
def extraer_datos_generales(soup):
    datos = {
        "categoria": "No categorizado",  # Valor por defecto
        "nombre": "",
        "sexo": ""
    }

    # 1️⃣ Buscar el ancla
    anchor = soup.find("a", {"name": "datos_generales"})
    if not anchor:
        print("No se encontró el ancla datos_generales")
        return datos

    # 2️⃣ La tabla está justo después del ancla
    tabla = anchor.find_next("table")
    if not tabla:
        print("No se encontró la tabla de datos generales")
        return datos

    # 3️⃣ Recorrer filas
    for fila in tabla.find_all("tr"):
        columnas = fila.find_all("td")
        if len(columnas) == 2:
            campo = limpiar(columnas[0].get_text())
            valor = limpiar(columnas[1].get_text())

            if campo == "Categoría":
                categoria_limpia = limpiar_categoria(valor)
                if categoria_limpia:  # Si existe una categoría válida
                    datos["categoria"] = categoria_limpia
                # Si no, se queda "No categorizado"
            elif campo == "Nombre":
                datos["nombre"] = valor
            elif campo == "Sexo":
                datos["sexo"] = valor

    return datos


#================================================
# EXTRAER ÚLTIMA FORMACIÓN ACADÉMICA
#================================================
def extraer_ultima_formacion_academica(soup):
    formacion = {
        "UltimaFormacionAcademica": ""
    }

    # 1️⃣ Buscar el ancla
    anchor = soup.find("a", {"name": "formacion_acad"})
    if not anchor:
        print("No se encontró el ancla formacion_acad")
        return formacion

    # 2️⃣ Buscar la tabla de formación académica
    tabla = anchor.find_next("table")
    if not tabla:
        print("No se encontró la tabla de formación académica")
        return formacion

    # 3️⃣ Buscar el primer <b> (nivel académico)
    bold = tabla.find("b")
    if not bold:
        print("No se encontró el nivel académico")
        return formacion

    texto_nivel = bold.get_text(strip=True)

    # 4️⃣ Quedarse solo con "Maestría"
    formacion["UltimaFormacionAcademica"] = texto_nivel.split("/")[0].strip()

    return formacion

#================================================
# EXTRAER TRABAJOS DIRIGIDOS
#================================================
def extraer_trabajos_dirigidos(soup):
    

    resultados = []

    anchor = soup.find("a", {"name": "trabajos_dirigi"})
    if not anchor:
        print("No se encontró la sección trabajos dirigidos")
        return resultados

    contenedor = anchor.find_parent("td")

    tipo_trabajo_actual = ""

    # Recorremos en orden todo lo que hay dentro del contenedor
    for elemento in contenedor.find_all(["b", "blockquote"], recursive=True):

        # 1️⃣ Si es un <b>, actualizamos el tipo de trabajo
        if elemento.name == "b":
            texto_b = limpiar(elemento.get_text())

            if "trabajos dirigidos/tutorías" in texto_b.lower():
                tipo_trabajo_actual = limpiar_tipo_trabajo(texto_b)
            else:
                tipo_trabajo_actual = ""

        # 2️⃣ Si es un <blockquote>, es un trabajo
        elif elemento.name == "blockquote" and tipo_trabajo_actual:
            texto = limpiar(elemento.get_text(" "))

            # 🔹 Separar por la PRIMERA coma (autor / título)
            partes = texto.split(",", 1)

            if len(partes) < 2:
                continue  # si no hay coma, ignorar

            texto_sin_autor = partes[1].strip()

            # 🔹 Año
            año_match = re.search(r"\b(20\d{2})\b", texto_sin_autor)
            año = año_match.group(1) if año_match else ""

            # 🔹 Cortar antes de "Estado:"
            estado_match = re.search(r"^(.*?)(?=Estado:)", texto_sin_autor, re.IGNORECASE)

            if estado_match:
                titulo = estado_match.group(1).strip(" ,")
            else:
                titulo = texto_sin_autor.strip(" ,")

            resultados.append({
                "NodoHijo": tipo_trabajo_actual,
                "Titulo_proyecto": titulo,
                "año": año
            })
    print(f"✅ Total TRABAJOS DIRIGIDOS: {len(resultados)}")
    return resultados

#================================================
# EXTRAER CONSULTORÍAS
#================================================
def extraer_consultorias(soup):

    resultados = []

    # 1️⃣ Buscar el encabezado exacto
    h3 = soup.find("h3", id="trabajos_tec")
    if not h3:
        print("⚠️ No se encontró el h3 de Consultorías")
        return resultados

    # 2️⃣ Buscar el <b> del tipo de consultoría
    tipo_b = h3.find_next("b")
    if not tipo_b:
        print("⚠️ No se encontró el tipo de consultoría")
        return resultados

    # 🧹 LIMPIAR NOMBRE DEL TIPO
    tipo_texto = limpiar(tipo_b.get_text())

    # Quitar "Producción técnica -"
    if " - " in tipo_texto:
        partes = tipo_texto.split(" - ")
        if len(partes) >= 2:
            tipo_texto = partes[1]  # Tomamos la parte central

    # Cortar si hay otro " -"
    if " - " in tipo_texto:
        tipo_texto = tipo_texto.split(" - ")[0]

    tipo_actual = tipo_texto.strip()

    # 3️⃣ Recorrer los blockquote siguientes SOLO dentro de esta sección
    for block in tipo_b.find_all_next("blockquote"):

        # 🛑 Detener si cambia de sección
        if block.find_previous("h3") != h3:
            break

        texto = limpiar(block.get_text(" "))

        # 🟢 Año
        anio_match = re.search(r"En:\s*[A-Za-z\s]+(?:,\s*)*,\s*(\d{4})", texto)
        anio = anio_match.group(1) if anio_match else ""

        # 🟢 Extraer título antes de "Nombre comercial"
        hasta_nombre = re.search(r"^(.*?)(?=Nombre comercial)", texto, re.IGNORECASE)
        titulo = ""

        if hasta_nombre:
            texto_hasta_nombre = hasta_nombre.group(1).strip()

            match_coma = list(re.finditer(r",\s*(?=[A-Z])", texto_hasta_nombre))
            if match_coma:
                ultima_coma = match_coma[-1].end()
                titulo = texto_hasta_nombre[ultima_coma:].strip(" ,")
            else:
                titulo = texto_hasta_nombre.strip(" ,")

            # ✂️ Cortar en " - "
            if " - " in titulo:
                titulo = titulo.split(" - ")[0].strip()

        resultados.append({
            "NodoHijo": tipo_actual,
            "Titulo_proyecto": titulo,
            "año": anio
        })

    print(f"✅ Total CONSULTORÍAS: {len(resultados)}")
    return resultados



def extraer_ediciones_revisiones(soup):
    resultados = []
    # Buscar la sección "Ediciones/revisiones"
    h3 = soup.find("h3", string=re.compile(r"Ediciones/revisiones", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Ediciones/revisiones")
        return resultados
    nodo_hijo = limpiar(h3.get_text())  # Nodo hijo: el título de la sección
    tabla = h3.find_parent("table")
    if not tabla:
        print("⚠️ No se encontró la tabla de Ediciones/revisiones")
        return resultados
    for li in tabla.find_all("li"):
        b_tag = li.find("b")
        if not b_tag:
            continue
        # Buscar el blockquote siguiente
        tr = li.find_parent("tr")
        siguiente_tr = tr.find_next_sibling("tr") if tr else None
        blockquote = siguiente_tr.find("blockquote") if siguiente_tr else None
        if not blockquote:
            continue
        texto = limpiar(blockquote.get_text(" "))
        # Título: después de la última coma antes de "Nombre comercial"
        match = re.search(r"(?:,)([^,]+),\s*Nombre comercial", texto)
        if match:
            titulo = match.group(1).strip()
        else:
            # Si no encuentra el patrón, buscar el último fragmento antes de "Nombre comercial"
            partes = texto.split(",")
            titulo = ""
            for i in range(len(partes)-1, -1, -1):
                if "Nombre comercial" in partes[i]:
                    if i > 0:
                        titulo = partes[i-1].strip()
                    break
            if not titulo and len(partes) > 1:
                titulo = partes[1].strip()
        # Año: buscar después de "Colombia,"
        anio = ""
        match_colombia = re.search(r"Colombia[, ]+.*?(\d{4})", texto)
        if match_colombia:
            anio = match_colombia.group(1)
        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total EDICIONES/REVISIONES: {len(resultados)}")
    return resultados

#================================================
# EXTRAER EVENTOS CIENTÍFICOS
#================================================
def extraer_eventos(soup):
    

    resultados = []

    anchor = soup.find("a", {"name": "evento"})
    if not anchor:
        print("⚠️ No se encontró la sección de eventos")
        return resultados

    contenedor = anchor.find_parent("td")

    # 🔹 Cada evento empieza con un <b> numérico (1,2,3...)
    for b in contenedor.find_all("b"):

        if not b.get_text(strip=True).isdigit():
            continue

        td_evento = b.find_parent("td")
        if not td_evento:
            continue

        texto = limpiar(td_evento.get_text(" "))

        # 🟢 Nombre del evento
        nombre_match = re.search(
            r"Nombre del evento:\s*(.*?)(?=Tipo de evento:|Ámbito:|Realizado el:)",
            texto,
            re.IGNORECASE
        )
        nombre_evento = nombre_match.group(1).strip() if nombre_match else ""

        # 🟢 Año
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        anio = anio_match.group() if anio_match else ""

        if nombre_evento:
            resultados.append({
                "NodoHijo": "Evento científico",
                "Titulo_proyecto": nombre_evento,
                "año": anio
            })
    print(f"✅ Total EVENTOS CIENTÍFICOS: {len(resultados)}")
    return resultados

def extraer_redes_conocimiento(soup):
    resultados = []
    # Buscar la sección "Redes de conocimiento especializado"
    h3 = soup.find("h3", string=re.compile(r"Redes de conocimiento especializado", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Redes de conocimiento especializado")
        return resultados
    tabla = h3.find_parent("table")
    if not tabla:
        print("⚠️ No se encontró la tabla de Redes de conocimiento especializado")
        return resultados
    for blockquote in tabla.find_all("blockquote"):
        titulo = ""
        for i_tag in blockquote.find_all("i"):
            if "Nombre de la red" in i_tag.get_text():
                # Tomar todo el texto desde el next_sibling hasta "Creada el:"
                partes = []
                nodo = i_tag.next_sibling
                while nodo:
                    texto = str(nodo)
                    if "Creada el:" in texto:
                        break
                    partes.append(texto)
                    nodo = nodo.next_sibling
                titulo = limpiar("".join(partes))
                break
        # Año: buscar en "Creada el:YYYY-MM-DD"
        texto = limpiar(blockquote.get_text(" "))
        match_anio = re.search(r"Creada el:(\d{4})", texto)
        anio = match_anio.group(1) if match_anio else ""
        if titulo:
            resultados.append({
                "NodoHijo": "Redes de conocimiento especializado",
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total REDES DE CONOCIMIENTO ESPECIALIZADO: {len(resultados)}")
    return resultados
#================================================
# EXTRAER FORTALECIMIENTO O SOLUCIÓN DE ASUNTOS DE INTERÉS
#================================================
def extraer_apropiacion_social(soup):
    

    resultados = []

    # 1️⃣ Buscar la sección
    h3 = soup.find("h3", string=re.compile(
        r"Fortalecimiento o solución de asuntos de interés social",
        re.IGNORECASE
    ))

    if not h3:
        print("⚠️ No se encontró la sección de Apropiación Social")
        return resultados

    # 2️⃣ Buscar todos los <b> después del h3 hasta otro h3
    for elem in h3.find_all_next():

        # 🛑 cortar si empieza otra sección
        if elem.name == "h3":
            break

        # 🎯 detectar cada nodo hijo (<b>)
        if elem.name == "b" and "Apropiación social del conocimiento" in elem.get_text():

            texto_b = limpiar(elem.get_text())

            # 🔹 NodoHijo después del guion
            nodo_hijo = ""
            if "-" in texto_b:
                nodo_hijo = texto_b.split("-", 1)[1].strip()

            # 🔹 Buscar el blockquote siguiente (producto)
            blockquote = elem.find_next("blockquote")
            if not blockquote:
                continue

            titulo = ""
            anio = ""

            children = list(blockquote.children)

            for i, child in enumerate(children):

                # Nombre del producto
                if getattr(child, "name", None) == "i" and "Nombre del producto" in child.get_text():
                    if i + 1 < len(children):
                        titulo = limpiar(children[i + 1])

                # Año
                if getattr(child, "name", None) == "i" and "Fecha de presentación" in child.get_text():
                    if i + 1 < len(children):
                        texto_fecha = limpiar(children[i + 1])
                        anio_match = re.search(r"\b(19|20)\d{2}\b", texto_fecha)
                        if anio_match:
                            anio = anio_match.group()

            if titulo:
                resultados.append({
                    "NodoHijo": nodo_hijo,
                    "Titulo_producto": titulo,
                    "año": anio
                })
    print(f"✅ Total APROPIACIÓN SOCIAL: {len(resultados)}")
    return resultados

#================================================
# EXTRAER GENERACIÓN DE INSUMOS DE POLÍTICA PÚBLICA Y NORMATIVIDAD
#================================================
def extraer_apropiacion_normatividad(soup):
    

    resultados = []

    # 1️⃣ Buscar la sección
    h3 = soup.find("h3", string=re.compile(
        r"Generación de insumos de política pública y normatividad",
        re.IGNORECASE
    ))

    if not h3:
        print("⚠️ No se encontró la sección de Generación de insumos de política pública y normatividad")
        return resultados

    # 2️⃣ Buscar todos los <b> después del h3 hasta otro h3
    for elem in h3.find_all_next():

        # 🛑 cortar si empieza otra sección
        if elem.name == "h3":
            break

        # 🎯 detectar cada nodo hijo (<b>)
        if elem.name == "b" and "Apropiación social del conocimiento" in elem.get_text():

            texto_b = limpiar(elem.get_text())

            # 🔹 NodoHijo después del guion
            nodo_hijo = ""
            if "-" in texto_b:
                nodo_hijo = texto_b.split("-", 1)[1].strip()

            # 🔹 Buscar el blockquote siguiente (producto)
            blockquote = elem.find_next("blockquote")
            if not blockquote:
                continue

            titulo = ""
            anio = ""

            children = list(blockquote.children)

            for i, child in enumerate(children):

                # Nombre del producto
                if getattr(child, "name", None) == "i" and "Nombre del producto" in child.get_text():
                    if i + 1 < len(children):
                        titulo = limpiar(children[i + 1])

                # Año
                if getattr(child, "name", None) == "i" and "Fecha de presentación" in child.get_text():
                    if i + 1 < len(children):
                        texto_fecha = limpiar(children[i + 1])
                        anio_match = re.search(r"\b(19|20)\d{2}\b", texto_fecha)
                        if anio_match:
                            anio = anio_match.group()

            if titulo:
                resultados.append({
                    "NodoHijo": nodo_hijo,
                    "Titulo_producto": titulo,
                    "año": anio
                })
    print(f"✅ Total APROPIACIÓN NORMATIVIDAD: {len(resultados)}")
    return resultados

def extraer_apropiacion_cadenas_productivas(soup):
    

    resultados = []

    # 1️⃣ Buscar la sección
    h3 = soup.find("h3", string=re.compile(
        r"Fortalecimiento de cadenas productivas",
        re.IGNORECASE
    ))

    if not h3:
        print("⚠️ No se encontró la sección de Fortalecimiento de cadenas productivas")
        return resultados

    # 2️⃣ Buscar todos los <b> después del h3 hasta otro h3
    for elem in h3.find_all_next():

        # 🛑 cortar si empieza otra sección
        if elem.name == "h3":
            break

        # 🎯 detectar cada nodo hijo (<b>)
        if elem.name == "b" and "Apropiación social del conocimiento" in elem.get_text():

            texto_b = limpiar(elem.get_text())

            # 🔹 NodoHijo después del guion
            nodo_hijo = ""
            if "-" in texto_b:
                nodo_hijo = texto_b.split("-", 1)[1].strip()

            # 🔹 Buscar el blockquote siguiente (producto)
            blockquote = elem.find_next("blockquote")
            if not blockquote:
                continue

            titulo = ""
            anio = ""

            children = list(blockquote.children)

            for i, child in enumerate(children):

                # Nombre del producto
                if getattr(child, "name", None) == "i" and "Nombre del producto" in child.get_text():
                    if i + 1 < len(children):
                        titulo = limpiar(children[i + 1])

                # Año
                if getattr(child, "name", None) == "i" and "Fecha de presentación" in child.get_text():
                    if i + 1 < len(children):
                        texto_fecha = limpiar(children[i + 1])
                        anio_match = re.search(r"\b(19|20)\d{2}\b", texto_fecha)
                        if anio_match:
                            anio = anio_match.group()

            if titulo:
                resultados.append({
                    "NodoHijo": nodo_hijo,
                    "Titulo_producto": titulo,
                    "año": anio
                })
    print(f"✅ Total FORTALECIMIENTO DE CADENAS PRODUCTIVAS: {len(resultados)}")
    return resultados

def extraer_produccion_contenido_transmedia(soup):
    

    resultados = []

    # 1️⃣ Buscar la sección
    h3 = soup.find(
        "h3",
        string=re.compile(
            r"Producción de estrategias y contenidos transmedia",
            re.IGNORECASE
        )
    )

    if not h3:
        print("⚠️ No se encontró la sección de Producción de estrategias y contenidos transmedia")
        return resultados

    # 2️⃣ Recorrer elementos hasta otro h3
    for elem in h3.find_all_next():

        if elem.name == "h3":
            break

        # 3️⃣ Detectar el <b> correcto
        if elem.name == "b" and "producción de estrategias y contenidos transmedia" in elem.get_text().lower():

            texto_b = limpiar(elem.get_text())

            # 🔹 NodoHijo = después del guion
            nodo_hijo = ""
            if "-" in texto_b:
                nodo_hijo = texto_b.split("-", 1)[1].strip()

            # 4️⃣ Buscar el blockquote siguiente
            blockquote = elem.find_next("blockquote")
            if not blockquote:
                continue

            titulo = ""
            anio = ""

            # 5️⃣ Recorrer los <i> del blockquote
            for i_tag in blockquote.find_all("i"):

                texto_i = limpiar(i_tag.get_text()).lower()

                # 🔹 Nombre del producto
                if "nombre del producto" in texto_i:
                    siguiente = i_tag.next_sibling
                    if siguiente:
                        titulo = limpiar(str(siguiente))

                # 🔹 Año
                if "fecha de presentación" in texto_i:
                    siguiente = i_tag.next_sibling
                    if siguiente:
                        año_match = re.search(r"\b(19|20)\d{2}\b", str(siguiente))
                        if año_match:
                            anio = año_match.group()

            if titulo:
                resultados.append({
                    "NodoHijo": nodo_hijo,
                    "Titulo_producto": titulo,
                    "año": anio
                })
    print(f"✅ Total PRODUCCIÓN DE ESTRATEGIAS Y CONTENIDOS TRANSMEDIA: {len(resultados)}")
    return resultados

def extraer_contenido_digital_audiovisual(soup):
    resultados = []
    # Buscar la tabla con h3 "Producciones de contenido digital Audiovisual"
    h3 = soup.find("h3", string=re.compile(r"Producciones de contenido digital Audiovisual", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección de contenido digital audiovisual")
        return resultados
    tabla = h3.find_parent("table")
    if not tabla:
        print("⚠️ No se encontró la tabla de contenido digital audiovisual")
        return resultados
    for blockquote in tabla.find_all("blockquote"):
        titulo = ""
        anio = ""
        for i_tag in blockquote.find_all("i"):
            texto_i = limpiar(i_tag.get_text()).lower()
            if "nombre del producto" in texto_i:
                siguiente = i_tag.next_sibling
                if siguiente:
                    titulo = limpiar(str(siguiente))
            if "fecha de presentación" in texto_i:
                siguiente = i_tag.next_sibling
                max_busca = 5
                while siguiente and max_busca > 0:
                    texto = limpiar(str(siguiente))
                    anio_match = re.search(r"(19|20)\d{2}", texto)
                    if anio_match:
                        anio = anio_match.group(0)
                        break
                    siguiente = siguiente.next_sibling
                    max_busca -= 1
        if titulo:
            resultados.append({
                "NodoHijo": "Producciones de contenido digital Audiovisual",
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total CONTENIDO DIGITAL AUDIOVISUAL: {len(resultados)}")
    return resultados



#================================================
# EXTRAER DESARROLLOS WEB
#================================================

def extraer_desarrollos_web(soup):
    

    resultados = []

    # 1️⃣ Buscar la sección
    h3 = soup.find("h3", string=re.compile(
        r"Desarrollos web",
        re.IGNORECASE
    ))

    if not h3:
        print("⚠️ No se encontró la sección Desarrollos web")
        return resultados

    # 2️⃣ Recorrer elementos hasta otro h3
    for elem in h3.find_all_next():

        if elem.name == "h3":
            break

        # 🎯 Detectar el <b>
        if elem.name == "b" and "Divulgación pública de la ciencia" in elem.get_text():

            texto_b = limpiar(elem.get_text())

            nodo_hijo = ""

            # 🔹 Tomar texto después del guion
            if "-" in texto_b:
                parte = texto_b.split("-", 1)[1].strip()

                # 🔹 Cortar antes de los dos puntos
                if ":" in parte:
                    nodo_hijo = parte.split(":", 1)[0].strip()
                else:
                    nodo_hijo = parte.strip()

            # 🔹 Buscar blockquote
            blockquote = elem.find_next("blockquote")
            if not blockquote:
                continue

            titulo = ""
            anio = ""

            children = list(blockquote.children)

            for i, child in enumerate(children):

                # Nombre del producto
                if getattr(child, "name", None) == "i" and "Nombre del producto" in child.get_text():
                    if i + 1 < len(children):
                        titulo = limpiar(children[i + 1])

                # Año
                if getattr(child, "name", None) == "i" and "Fecha de presentación" in child.get_text():
                    if i + 1 < len(children):
                        texto_fecha = limpiar(children[i + 1])
                        anio_match = re.search(r"\b(19|20)\d{2}\b", texto_fecha)
                        if anio_match:
                            anio = anio_match.group()

            if titulo:
                # Eliminar coma final si existe
                titulo_limpio = titulo.rstrip(',').strip()
                resultados.append({
                    "NodoHijo": nodo_hijo,
                    "Titulo_producto": titulo_limpio,
                    "año": anio
                })
    print(f"✅ Total DESARROLLOS WEB: {len(resultados)}")
    return resultados

#================================================
# EXTRAER ARTÍCULOS
#================================================
def extraer_articulos(soup):
    

    resultados = []

    # 1️⃣ Buscar ancla de artículos
    anchor = soup.find("a", {"name": "articulos"})
    if not anchor:
        print("⚠️ No se encontró la sección de artículos")
        return resultados

    contenedor = anchor.find_parent("td")

    # 2️⃣ Iterar cada blockquote (cada artículo o grupo de artículos)
    for block in contenedor.find_all("blockquote", recursive=True):
        texto = limpiar(block.get_text(" "))

        # 🟢 Extraer todos los títulos entre comillas simples o dobles
        # Esto captura: "Título" o ""Título""
        titulos = re.findall(r'"{1,2}\s*(.*?)\s*"{1,2}', texto)

        # Extraemos el año
        parte_antes_doi = texto.split("DOI")[0]
        anios = re.findall(r"\b(?:19|20)\d{2}\b", parte_antes_doi)
        anio = anios[-1] if anios else ""

        # Agregar todos los títulos encontrados
        for titulo in titulos:
            if titulo.strip():  # Evitar títulos vacíos
                resultados.append({
                    "NodoHijo": "Artículo",
                    "Titulo_proyecto": titulo.strip(),
                    "año": anio
                })
    print(f"✅ Total ARTÍCULOS: {len(resultados)}")
    return resultados

#================================================
# EXTRAER LIBROS
#================================================
def extraer_libros(soup):
    resultados = []

    # 1️⃣ Buscar el h3 que diga exactamente "Libros"
    h3_libros = soup.find("h3", string=re.compile(r"^Libros$", re.I))
    if not h3_libros:
        return resultados

    # 2️⃣ Subir a la tabla que contiene esa sección
    tabla_libros = h3_libros.find_parent("table")
    if not tabla_libros:
        return resultados

    # 3️⃣ Buscar todos los <li> dentro de esa tabla
    items = tabla_libros.find_all("li")

    for li in items:
        b_tag = li.find("b")
        if not b_tag:
            continue

        texto_categoria = b_tag.get_text(" ", strip=True)

        # Validar estructura tipo: Producción bibliográfica - Libro - ...
        if texto_categoria.count("-") < 2:
            continue

        partes = [p.strip() for p in texto_categoria.split("-")]
        nodo_hijo = partes[1]

        # 4️⃣ Buscar el blockquote siguiente
        block = li.find_next("blockquote")

        # Asegurar que el blockquote pertenece a esta tabla
        if not block or block.find_parent("table") != tabla_libros:
            continue

        texto_block = block.get_text(" ", strip=True)

        # 5️⃣ Extraer título entre comillas
        match_titulo = re.search(r'"([^"]+)"', texto_block)
        if not match_titulo:
            continue

        titulo = match_titulo.group(1).strip()

        # 6️⃣ Extraer año
        match_anio = re.search(r'\b(19|20)\d{2}\b', texto_block)
        anio = match_anio.group(0) if match_anio else None

        resultados.append({
            "NodoHijo": nodo_hijo,
            "Titulo_proyecto": titulo,
            "año": anio
        })
    print(f"✅ Total LIBROS: {len(resultados)}")
    return resultados


#================================================
# EXTRAER CAPÍTULOS DE LIBRO
#================================================
def extraer_capitulos_libro(soup):
    resultados = []
    # Buscar el ancla de capítulos de libro
    anchor = soup.find("a", {"name": "capitulos"})
    if not anchor:
        print("⚠️ No se encontró la sección de capítulos de libro")
        return resultados
    contenedor = anchor.find_parent("td")
    nodo_hijo = "Capítulos de libro"
    # Buscar todos los blockquote dentro del contenedor
    for block in contenedor.find_all("blockquote", recursive=True):
        texto = limpiar(block.get_text(" "))
        # Buscar el título entre comillas (simples, dobles o dobles con acento)
        titulo_match = re.search(r"[\"'“”«»]{1,2}\s*(.*?)\s*[\"'“”«»]{1,2}", texto)
        titulo = titulo_match.group(1).strip() if titulo_match else ""
        # Si no encuentra título, buscar después de la última coma (después de los autores)
        if not titulo:
            partes = texto.split(",")
            if len(partes) > 1:
                posible = partes[-1]
                # Buscar comillas en ese fragmento
                titulo_match = re.search(r"[\"'“”«»]{1,2}\s*(.*?)\s*[\"'“”«»]{1,2}", posible)
                if titulo_match:
                    titulo = titulo_match.group(1).strip()
        # Año: buscar el primer año de 4 dígitos
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        anio = anio_match.group(0) if anio_match else ""
        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total CAPÍTULOS DE LIBRO: {len(resultados)}")
    return resultados

#================================================
# EXTRAER TEXTOS EN PUBLICACIONES NO CIENTÍFICAS
#================================================
def extraer_textos_publicaciones_no_cientificas(soup):

    resultados = []

    # 1️⃣ Buscar la sección por h3 (más confiable que el ancla)
    h3 = soup.find(
        "h3",
        string=lambda t: t and "publicaciones no cient" in limpiar(t).lower()
    )
    if not h3:
        print("⚠️ No se encontró la sección Textos en publicaciones no científicas")
        return resultados

    # 2️⃣ Recorrer blockquotes de esta sección
    for blockquote in h3.find_all_next("blockquote"):
        if blockquote.find_previous("h3") != h3:
            break

        texto = limpiar(blockquote.get_text(" "))

        # 3️⃣ Título entre comillas
        titulo_match = re.search(r'"{1,2}\s*(.*?)\s*"{1,2}', texto)
        if titulo_match:
            titulo = titulo_match.group(1).strip()
        else:
            # Fallback: tomar texto antes de "En:" quitando autores iniciales
            parte = re.split(r"\.?\s*En:", texto, flags=re.IGNORECASE)[0].strip(" ,.")
            if "," in parte:
                parte = parte.split(",", 1)[1].strip(" ,.")
            titulo = parte

        if not titulo:
            continue

        # 4️⃣ Año
        anio_match = re.search(r"En:\s*[^\d]{0,120}(19|20)\d{2}", texto)
        if anio_match:
            anio = re.search(r"(19|20)\d{2}", anio_match.group(0)).group(0)
        else:
            anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
            anio = anio_match.group(0) if anio_match else ""

        resultados.append({
            "NodoHijo": "Textos en publicaciones no científicas",
            "Titulo_proyecto": titulo,
            "año": anio
        })

    print(f"✅ Total TEXTOS EN PUBLICACIONES NO CIENTÍFICAS: {len(resultados)}")
    return resultados

#================================================
# EXTRAER OTRA PRODUCCIÓN BIBLIOGRÁFICA
#================================================
def extraer_otra_produccion_bibliografica(soup):
    resultados = []
    vistos = set()
    # 1️⃣ Buscar sección "Otra producción blibliográfica" (con typo en el HTML)
    h3 = soup.find(
        "h3",
        string=lambda t: t and "otra" in limpiar(t).lower() and (
            "bibliográfica" in limpiar(t).lower() or 
            "blibliográfica" in limpiar(t).lower()
        )
    )
    if not h3:
        print("⚠️ No se encontró la sección Otra producción bibliográfica")
        return resultados
    contenedor = h3.find_parent("table")
    if not contenedor:
        print("⚠️ No se encontró contenedor de Otra producción bibliográfica")
        return resultados
    for b in contenedor.find_all("b"):
        texto_b = limpiar(b.get_text(" "))
        texto_b_lower = texto_b.lower()
        if not ("producci" in texto_b_lower and 
                "bibliogr" in texto_b_lower and 
                "otra" in texto_b_lower and 
                texto_b.strip().lower().endswith("otra")):
            continue
        tr = b.find_parent("tr")
        siguiente_tr = tr.find_next_sibling("tr") if tr else None
        blockquote = siguiente_tr.find("blockquote") if siguiente_tr else None
        if not blockquote:
            continue
        texto = limpiar(blockquote.get_text(" "))
        # Título: puede estar entre comillas o después de comas
        titulo = ""
        titulo_match = re.search(r'["«”]\s*(.*?)\s*["»”]', texto)
        if titulo_match:
            titulo = titulo_match.group(1).strip()
        else:
            partes = texto.split(",")
            if len(partes) > 1:
                titulo = partes[0].strip()
            else:
                titulo = texto.strip()
        # Año: tomar el primer año mencionado
        anio = ""
        anio_match = re.search(r"(19\d{2}|20\d{2})", texto)
        anio = anio_match.group(1) if anio_match else ""
        # Evitar duplicados
        clave = (titulo, anio)
        if titulo and clave not in vistos:
            resultados.append({
                "NodoHijo": "Otra producción bibliográfica",
                "Titulo_proyecto": titulo,
                "año": anio
            })
            vistos.add(clave)
    print(f"✅ Total OTRA PRODUCCIÓN BIBLIOGRÁFICA: {len(resultados)}")
    return resultados

#================================================
# EXTRAER INNOVACIONES DE GESTIÓN EMPRESARIAL
#================================================
def extraer_innovaciones_gestion_empresarial(soup):

    resultados = []

    # 1️⃣ Buscar todos los <b> que indiquen la sección
    for b in soup.find_all("b"):

        texto_b = limpiar(b.get_text())

        if "Producción técnica - Innovaciones generadas de producción empresarial" in texto_b:

            # 🧹 LIMPIAR NODOHIJO
            partes = texto_b.split(" - ")

            # Si tiene al menos 2 partes tomamos la parte central
            if len(partes) >= 2:
                nodo_hijo = partes[1].strip()
            else:
                nodo_hijo = texto_b.strip()

            # 2️⃣ Buscar el blockquote siguiente
            td_padre = b.find_parent("td")
            if not td_padre:
                continue

            block = td_padre.find_next("blockquote")
            if not block:
                continue

            texto = limpiar(block.get_text(" "))

            # 3️⃣ Extraer título antes de "Nombre comercial"
            hasta_nombre = re.search(r"^(.*?)(?=Nombre comercial)", texto, re.IGNORECASE)
            titulo = ""

            if hasta_nombre:
                texto_hasta_nombre = hasta_nombre.group(1).strip()

                match_coma = list(re.finditer(r",\s*(?=[A-Z])", texto_hasta_nombre))
                if match_coma:
                    ultima_coma = match_coma[-1].end()
                    titulo = texto_hasta_nombre[ultima_coma:].strip(" ,")
                else:
                    titulo = texto_hasta_nombre.strip(" ,")

                # ✂️ Cortar en " - "
                if " - " in titulo:
                    titulo = titulo.split(" - ")[0].strip()

            # 4️⃣ Año
            anio_match = re.search(r"En:\s*[A-Za-z\s]+(?:,\s*)*,\s*(\d{4})", texto)
            anio = anio_match.group(1) if anio_match else ""

            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })

    print(f"✅ Total INNOVACIONES DE GESTIÓN EMPRESARIAL: {len(resultados)}")
    return resultados
#================================================
# EXTRAER DOCUMENTOS DE TRABAJO
#================================================
def extraer_documentos_trabajo(soup):
    

    resultados = []

    # 1️⃣ Buscar sección "Documentos de trabajo"
    h3 = soup.find("h3", string=re.compile(r"Documentos de trabajo", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Documentos de trabajo")
        return resultados

    # 2️⃣ Recorrer todos los blockquote dentro de la sección hasta otro h3
    for blockquote in h3.find_all_next("blockquote"):
        if blockquote.find_previous("h3") != h3:
            break  # salió de la sección

        texto_block = limpiar(blockquote.get_text(" "))

        # 3️⃣ NodoHijo: buscar el <b> más cercano antes del blockquote
        b_antes = blockquote.find_previous("b")
        nodo_hijo = ""
        if b_antes:
            texto_b = limpiar(b_antes.get_text())
            if "-" in texto_b:
                nodo_hijo = texto_b.split("-", 1)[1].strip()
                nodo_hijo = re.sub(r"\(.*?\)", "", nodo_hijo).strip()

        # 4️⃣ Título entre comillas
        titulo_match = re.search(r'"([^"]+)"', texto_block)
        if not titulo_match:
            continue  # ignorar blockquote sin título
        titulo = titulo_match.group(1).strip()

        # 5️⃣ Año: primero En: <país>, si no fallback a cualquier año
        anio_match = re.search(r"En:\s*[A-Za-z\s]+(?:,\s*)*,\s*(\d{4})", texto_block)
        if anio_match:
            anio = anio_match.group(1)
        else:
            anio_match = re.search(r"\b(19|20)\d{2}\b", texto_block)
            anio = anio_match.group() if anio_match else ""

        # 6️⃣ Evitar duplicados: comparar NodoHijo + título + año
        if not any(r["NodoHijo"] == nodo_hijo and r["Titulo_documento"] == titulo and r["año"] == anio for r in resultados):
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_documento": titulo,
                "año": anio
            })
    
    print(f"✅ Total DOCUMENTOS DE TRABAJO: {len(resultados)}")
    return resultados
def extraer_otra_produccion_bibliografica_detallada(soup):
    resultados = []
    h3 = soup.find("h3", string=re.compile(r"Otra producción blibliográfica|Otra producción bibliográfica", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Otra producción bibliográfica detallada")
        return resultados
    tabla = h3.find_parent("table")
    if not tabla:
        print("⚠️ No se encontró la tabla de Otra producción bibliográfica detallada")
        return resultados
    for li in tabla.find_all("li"):
        b_tag = li.find("b")
        if not b_tag:
            continue
        texto_b = limpiar(b_tag.get_text())
        # Nodo hijo: después del primer guion
        nodo_hijo = ""
        if "-" in texto_b:
            partes = [p.strip() for p in texto_b.split("-")]
            if len(partes) > 1:
                nodo_hijo = partes[1]
            else:
                nodo_hijo = texto_b.strip()
        else:
            nodo_hijo = texto_b.strip()
        # Buscar el blockquote siguiente
        tr = li.find_parent("tr")
        siguiente_tr = tr.find_next_sibling("tr") if tr else None
        blockquote = siguiente_tr.find("blockquote") if siguiente_tr else None
        if not blockquote:
            continue
        texto = limpiar(blockquote.get_text(" "))
        # Título: entre comillas o antes de 'En:'
        titulo = ""
        titulo_match = re.search(r'"([^"]+)"', texto)
        if titulo_match:
            titulo = titulo_match.group(1).strip()
        else:
            parte = re.split(r"\.\s*En:", texto, flags=re.IGNORECASE)[0].strip(" ,.")
            if "," in parte:
                parte = parte.split(",", 1)[1].strip(" ,.")
            titulo = parte
        # Año: buscar el primer año de 4 dígitos
        anio = ""
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        if anio_match:
            anio = anio_match.group(0)
        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total OTRA PRODUCCIÓN BIBLIOGRÁFICA DETALLADA: {len(resultados)}")
    return resultados
#================================================
# EXTRAER PATENTES
#================================================
def extraer_patentes(soup):
    

    resultados = []

    anchor = soup.find("a", {"name": "patentes"})
    if not anchor:
        print("No se encontró la sección Patentes")
        return resultados

    contenedor = anchor.find_parent("td")

    nodo_hijo = "Patente"

    for blockquote in contenedor.find_all("blockquote"):

        texto = limpiar(blockquote.get_text(" "))

        # 🔹 TÍTULO: después del "-" hasta la primera coma
        titulo = ""
        titulo_match = re.search(r"-\s*([^,]+)", texto)
        if titulo_match:
            titulo = titulo_match.group(1).strip()

        # 🔹 AÑO: desde fecha YYYY-MM-DD
        anio = ""
        anio_match = re.search(r"\b(19|20)\d{2}(?=-\d{2}-\d{2})", texto)
        if anio_match:
            anio = anio_match.group(0)

        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_patente": titulo,
                "año": anio
            })

    print(f"✅ Total PATENTES: {len(resultados)}")
    return resultados
def extraer_reglamentos(soup):
    resultados = []
    # Buscar la sección "Reglamentos"
    h3 = soup.find("h3", string=re.compile(r"Reglamentos", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Reglamentos")
        return resultados
    tabla = h3.find_parent("table")
    if not tabla:
        print("⚠️ No se encontró la tabla de Reglamentos")
        return resultados
    for li in tabla.find_all("li"):
        b_tag = li.find("b")
        if not b_tag:
            continue
        texto_b = limpiar(b_tag.get_text())
        # Nodo hijo: después del primer guion
        nodo_hijo = ""
        if "-" in texto_b:
            partes = [p.strip() for p in texto_b.split("-")]
            if len(partes) > 1:
                nodo_hijo = partes[1]
            else:
                nodo_hijo = texto_b.strip()
        else:
            nodo_hijo = texto_b.strip()
        # Buscar el blockquote siguiente
        tr = li.find_parent("tr")
        siguiente_tr = tr.find_next_sibling("tr") if tr else None
        blockquote = siguiente_tr.find("blockquote") if siguiente_tr else None
        if not blockquote:
            continue
        texto = limpiar(blockquote.get_text(" "))
        # Título: antes de la primera coma después del nombre
        partes = texto.split(",")
        titulo = ""
        if len(partes) > 1:
            titulo = partes[1].strip()
        else:
            titulo = texto.strip()
        # Año: buscar el primer año de 4 dígitos
        anio = ""
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        if anio_match:
            anio = anio_match.group(0)
        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_reglamento": titulo,
                "año": anio
            })
    print(f"✅ Total REGLAMENTOS: {len(resultados)}")
    return resultados
#================================================
# EXTRAER SECRETOS EMPRESARIALES
#================================================
def extraer_secretos_empresariales(soup ):
    

    resultados = []

    anchor = soup.find("a", {"name": "secretos"})
    if not anchor:
        print("No se encontró la sección Secretos empresariales")
        return resultados

    contenedor = anchor.find_parent("td")

    nodo_hijo = "Secreto empresarial"

    # Recorremos SOLO los <b> dentro del contenedor
    for b in contenedor.find_all("b"):

        titulo = limpiar(b.get_text())

        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_secreto": titulo,
                "año": ""
            })
    print(f"✅ Total SECRETOS EMPRESARIALES: {len(resultados)}")
    return resultados

#================================================
# EXTRAER SOFTWARE
#================================================
def extraer_software(soup):
    

    resultados = []

    anchor = soup.find("a", {"name": "software"})
    if not anchor:
        print("⚠️ No se encontró la sección de software")
        return resultados

    contenedor = anchor.find_parent("td")
    nodo_hijo = "Software"

    for block in contenedor.find_all("blockquote", recursive=True):

        texto = limpiar(block.get_text(" "))

        # ✅ EXTRAER TÍTULO: lo que está antes de ", Nombre comercial"
        titulo_match = re.search(
            r"([^,]+)(?=,\s*Nombre comercial)",
            texto,
            re.IGNORECASE
        )
        titulo = titulo_match.group(1).strip() if titulo_match else ""

        # ✅ EXTRAER AÑO
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        anio = anio_match.group() if anio_match else ""

        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total SOFTWARE: {len(resultados)}")
    return resultados


#================================================
# EXTRAER OTROS PRODUCTOS TECNOLÓGICOS
#================================================
def extraer_otros_productos_tecnologicos(soup):

    resultados = []

    # 1️⃣ Buscar sección de productos tecnológicos
    h3 = soup.find("h3", string=re.compile(r"Productos tecnológicos", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Productos tecnológicos")
        return resultados

    contenedor = h3.find_parent("table")
    if not contenedor:
        print("⚠️ No se encontró contenedor de Productos tecnológicos")
        return resultados

    def es_probable_autor(fragmento):
        frag = limpiar(fragmento).strip(" ,.")
        if not frag:
            return False
        palabras = [p for p in frag.split() if p]
        if len(palabras) < 2 or len(palabras) > 6:
            return False
        return frag == frag.upper()

    # 2️⃣ Buscar solo subtipos "... Productos tecnológicos - Otro"
    for b in contenedor.find_all("b"):
        texto_b = limpiar(b.get_text(" "))
        if "Producción técnica - Productos tecnológicos - Otro" not in texto_b:
            continue

        tr = b.find_parent("tr")
        siguiente_tr = tr.find_next_sibling("tr") if tr else None
        blockquote = siguiente_tr.find("blockquote") if siguiente_tr else None
        if not blockquote:
            continue

        texto = limpiar(blockquote.get_text(" "))

        # 3️⃣ Título: todo antes de "Nombre comercial", removiendo autores al inicio
        parte_titulo = re.split(r"\s*,\s*Nombre comercial\s*:", texto, flags=re.IGNORECASE)[0]
        parte_titulo = parte_titulo.strip(" ,.")

        fragmentos = [f.strip(" ,.") for f in parte_titulo.split(",") if f.strip(" ,.")]
        inicio_titulo = 0
        while inicio_titulo < len(fragmentos) and es_probable_autor(fragmentos[inicio_titulo]):
            inicio_titulo += 1

        titulo = ", ".join(fragmentos[inicio_titulo:]).strip(" ,.")
        if not titulo:
            titulo = parte_titulo

        # 4️⃣ Año
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        anio = anio_match.group(0) if anio_match else ""

        if titulo:
            resultados.append({
                "NodoHijo": "Otros productos tecnológicos",
                "Titulo_proyecto": titulo,
                "año": anio
            })

    print(f"✅ Total OTROS PRODUCTOS TECNOLÓGICOS: {len(resultados)}")
    return resultados


#================================================
# EXTRAER PROTOTIPOS INDUSTRIALES
#================================================
def extraer_prototipos_industriales(soup):
    
    resultados = []

    # 1️⃣ Buscar la sección Prototipos
    h3 = soup.find("h3", string=re.compile(r"Prototipos", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Prototipos")
        return resultados

    # 2️⃣ Contenedor general
    contenedor = h3.find_parent("table")

    nodo_hijo = "Prototipo industrial"

    # 3️⃣ Recorremos todos los <b> de prototipo industrial
    for b in contenedor.find_all("b"):

        texto_b = limpiar(b.get_text())

        if "Prototipo - Industrial" not in texto_b:
            continue

        # 4️⃣ El blockquote SIEMPRE está en el siguiente <tr>
        tr = b.find_parent("tr")
        siguiente_tr = tr.find_next_sibling("tr")
        if not siguiente_tr:
            continue

        blockquote = siguiente_tr.find("blockquote")
        if not blockquote:
            continue

        texto = blockquote.get_text(" ", strip=True)

        # 5️⃣ TÍTULO → antes de "Nombre comercial:"
        parte_util = texto.split("Nombre comercial:")[0]
        fragmentos = [f.strip() for f in parte_util.split(",") if f.strip()]
        titulo = fragmentos[-1] if fragmentos else ""

        # 6️⃣ AÑO
        anio_match = re.search(r",\s*(19|20)\d{2}\s*,", texto)
        anio = anio_match.group(0).replace(",", "").strip() if anio_match else ""

        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_prototipo": limpiar(titulo),
                "año": anio
            })
    print(f"✅ Total PROTOTIPOS INDUSTRIALES: {len(resultados)}")
    return resultados

#================================================
# EXTRAER INNOVACIÓN DE PROCESO O PROCEDIMIENTO
#================================================

def extraer_innovacion_procesos(soup):
    

    resultados = []

    # 1️⃣ Buscar el h3 exacto
    h3 = soup.find("h3", string=re.compile(
        r"Innovación de proceso o procedimiento", re.IGNORECASE
    ))

    if not h3:
        print("⚠️ No se encontró el h3 de Innovación de proceso o procedimiento")
        return resultados

    def es_probable_autor(fragmento):
        """Heurística: autores suelen ser nombres cortos en mayúsculas."""
        frag = limpiar(fragmento).strip(" ,.")
        if not frag:
            return False

        palabras = [p for p in frag.split() if p]
        if len(palabras) < 2 or len(palabras) > 6:
            return False

        # Permitir letras (incluyendo tildes), guiones y apóstrofes
        solo_texto = re.sub(r"[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\-']", "", frag)
        if not solo_texto:
            return False

        return frag == frag.upper()

    # 2️⃣ Recorrer hasta el siguiente h3
    for elem in h3.find_all_next():

        if elem.name == "h3":
            break

        if elem.name != "blockquote":
            continue

        texto = limpiar(elem.get_text(" "))

        # ✅ TÍTULO: todo antes de "Nombre comercial", quitando autores iniciales
        parte_titulo = re.split(r"\s*,\s*Nombre comercial\s*:", texto, flags=re.IGNORECASE)[0]
        parte_titulo = parte_titulo.strip(" ,.")

        fragmentos = [f.strip(" ,.") for f in parte_titulo.split(",") if f.strip(" ,.")]

        # Saltar autores iniciales (nombres cortos en mayúsculas)
        inicio_titulo = 0
        while inicio_titulo < len(fragmentos) and es_probable_autor(fragmentos[inicio_titulo]):
            inicio_titulo += 1

        titulo = ", ".join(fragmentos[inicio_titulo:]).strip(" ,.")

        # Fallback por seguridad
        if not titulo:
            titulo = parte_titulo

        # ✅ AÑO
        anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
        anio = anio_match.group() if anio_match else ""

        if titulo:
            resultados.append({
                "NodoHijo": "Innovación de proceso o procedimiento",
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total INNOVACIÓN DE PROCESOS O PROCEDIMIENTOS: {len(resultados)}")
    return resultados

#================================================
# EXTRAER INFORMES TÉCNICOS
#================================================

def extraer_informes_tecnicos(soup):

    resultados = []
    nodo_hijo = "Informe técnico"

    # 1️⃣ Buscar el comentario que marca el fin del bloque anterior
    comentario = soup.find(
        string=lambda text: isinstance(text, str) and "Fin Nuevo registro cientifico" in text
    )

    if not comentario:
        print("⚠️ No se encontró el comentario de referencia")
        return resultados

    # 2️⃣ Desde ahí buscar el h3 correcto
    seccion = comentario.find_next("h3", id="trabajos_tec")

    if not seccion:
        print("⚠️ No se encontró la sección trabajos_tec")
        return resultados

    # 3️⃣ Subir a la tabla contenedora correcta
    tabla = seccion.find_parent("table")

    if not tabla:
        print("⚠️ No se encontró tabla contenedora")
        return resultados

    # 4️⃣ Buscar SOLO los blockquote dentro de esa tabla
    bloques = tabla.find_all("blockquote")

    for block in bloques:

        # Obtener texto con saltos de línea reales
        texto = block.get_text("\n", strip=True)

        # 🔹 Extraer año (último año de 4 dígitos)
        anios = re.findall(r"\b(?:19|20)\d{2}\b", texto)
        anio = anios[-1] if anios else ""

        # 🔹 Tomar solo la parte antes de "Nombre comercial"
        parte_principal = texto.split("Nombre comercial")[0]

        # 🔹 Separar líneas limpias
        lineas = [l.strip(" ,") for l in parte_principal.split("\n") if l.strip()]

        # 🔹 El título suele ser la última línea antes de "Nombre comercial"
        titulo = lineas[-1] if lineas else ""
        titulo = quitar_tildes(titulo)

        resultados.append({
            "NodoHijo": nodo_hijo,
            "Titulo_proyecto": titulo,
            "año": anio
        })

    print(f"✅ Total informes técnicos encontrados: {len(resultados)}")

    return resultados


#================================================
# EXTRAER CONCEPTOS TÉCNICOS
#================================================
def extraer_conceptos_tecnicos(soup):
    

    resultados = []

    # 1️⃣ Buscar todos los <b> que indiquen "Producción técnica - Concepto técnico"
    for b in soup.find_all("b"):
        if "Producción técnica - Concepto técnico" in b.get_text():
            # NodoHijo: lo que está después del guion
            nodo_hijo = b.get_text().split("-", 1)[1].strip()

            # 2️⃣ Buscar el blockquote siguiente
            block = b.find_parent("td").find_next("blockquote")
            if not block:
                continue

            texto = limpiar(block.get_text(" "))

            # 3️⃣ Título: todo hasta "Institución solicitante"
            hasta_institucion = re.search(r"^(.*?)(?=Institución solicitante)", texto, re.IGNORECASE)
            titulo = ""
            if hasta_institucion:
                texto_hasta_inst = hasta_institucion.group(1).strip()

                # Buscar la última coma que tenga mayúscula a la derecha (para eliminar autores)
                match_coma = list(re.finditer(r",\s*(?=[A-Z])", texto_hasta_inst))
                if match_coma:
                    ultima_coma = match_coma[-1].end()
                    titulo = texto_hasta_inst[ultima_coma:].strip(" ,")
                else:
                    titulo = texto_hasta_inst.strip(" ,")

            # 4️⃣ Año: buscar "Fecha solicitud" o "Fecha de envío" y tomar 4 dígitos
            anio_match = re.search(r"Fecha solicitud:.*?(\d{4})", texto)
            if not anio_match:
                anio_match = re.search(r"Fecha de envío:.*?(\d{4})", texto)
            anio = anio_match.group(1) if anio_match else ""

            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total CONCEPTOS TÉCNICOS: {len(resultados)}")
    return resultados




#================================================
# EXTRAER INFORMES FINALES DE INVESTIGACIÓN
#================================================
def extraer_informes_finales_investigacion(soup):

    resultados = []
    nodo_hijo = "Informes finales de investigación"

    # 🔹 Buscar el h3 correctamente (tolerante)
    seccion = soup.find(
        "h3",
        string=lambda t: t and "Informes de investig" in t
    )

    if not seccion:
        return resultados

    tabla = seccion.find_parent("table")
    if not tabla:
        return resultados

    # 🔹 Iterar cada bloque
    for block in tabla.find_all("blockquote", recursive=True):

        # Obtener texto preservando saltos de línea
        texto = block.get_text("\n", strip=True)

        # ========================
        # 1️⃣ Extraer año (último año encontrado)
        # ========================
        anios = re.findall(r"\b(?:19|20)\d{2}\b", texto)
        anio = anios[-1] if anios else ""

        # ========================
        # 2️⃣ Extraer título
        # ========================
        
        # Cortar antes de ".En:" (lo que viene antes de Colombia)
        titulo_bruto = re.split(r"\.?\s*En:", texto, flags=re.IGNORECASE)[0]

        # Eliminar espacios múltiples (que pueden haber por el \n)
        titulo_bruto = re.sub(r"\s+", " ", titulo_bruto)

        # ========================
        # 3️⃣ Eliminar TODOS los autores
        # ========================
        # Los autores siguen el patrón: "NOMBRE APELLIDO, NOMBRE APELLIDO, ..."
        # El título empieza después de la última coma que separa un nombre de un título más largo
        
        # Estrategia: buscar la última secuencia de "PALABRA MAYUSCULA, PALABRA MAYUSCULA, ..."
        # y luego el título comienza después
        
        # Dividir por comas
        partes = [p.strip() for p in titulo_bruto.split(",")]
        
        # Encontrar dónde termina la lista de autores
        # Los nombres autores suelen ser cortos y sin palabras muy largas
        # El título es significativamente más largo
        
        indice_titulo = 0
        for i, parte in enumerate(partes):
            # Si la parte tiene palabras largas (>10 caracteres) o contiene minúsculas al inicio
            # es probable que sea el título
            palabras = parte.split()
            tiene_palabra_larga = any(len(p) > 10 for p in palabras)
            tiene_minuscula_inicio = parte and parte[0].islower()
            
            # Si encontramos una parte que parece un título (no es un nombre corto)
            # ese es nuestro punto de corte
            if tiene_palabra_larga or tiene_minuscula_inicio or len(parte) > 40:
                indice_titulo = i
                break
        
        # Si no encontramos un punto de corte claro, tomar de la penúltima parte en adelante
        if indice_titulo == 0 and len(partes) > 1:
            indice_titulo = len(partes) - 1
        
        # Reconstruir el título desde el índice identificado
        titulo = ", ".join(partes[indice_titulo:]).strip(" ,.")
        
        # Aplicar función para quitar tildes (si existe)
        try:
            titulo = quitar_tildes(titulo)
        except:
            pass

        if titulo and len(titulo) > 3:  # Asegurar que sea un título válido
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total INFORMES FINALES DE INVESTIGACIÓN: {len(resultados)}")
    return resultados



def extraer_eventos_artistico(soup):
    resultados = []
    # Buscar la sección "Eventos artísticos"
    h3 = soup.find("h3", string=re.compile(r"Eventos artísticos", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Eventos artísticos")
        return resultados
    tabla = h3.find_parent("table")
    if not tabla:
        print("⚠️ No se encontró la tabla de Eventos artísticos")
        return resultados
    for blockquote in tabla.find_all("blockquote"):
        texto = limpiar(blockquote.get_text(" "))
        # Título: extraer solo el nombre del evento
        titulo = ""
        match_titulo = re.search(r"Nombre del evento:\s*([^\n\r<]+?)(?:\s{2,}|Fecha de inicio:|Tipo del evento:|$)", texto)
        if match_titulo:
            titulo = match_titulo.group(1).strip(" ,.")
        # Año: buscar después de "Fecha de inicio:"
        anio = ""
        match_fecha = re.search(r"Fecha de inicio:\s*(\d{4})", texto)
        if match_fecha:
            anio = match_fecha.group(1)
        if titulo:
            resultados.append({
                "NodoHijo": "Evento artístico",
                "Titulo_evento": titulo,
                "año": anio
            })
    print(f"✅ Total EVENTOS ARTÍSTICOS: {len(resultados)}")
    return resultados
def extraer_obras_productos(soup):
    resultados = []
    tabla = soup.find("table", id="obras_productos")
    if not tabla:
        print("⚠️ No se encontró la tabla de obras o productos")
        return resultados

    for blockquote in tabla.find_all("blockquote"):
        titulo = ""
        anio = ""
        for i_tag in blockquote.find_all("i"):
            texto_i = limpiar(i_tag.get_text()).lower()
            if "nombre del producto" in texto_i:
                siguiente = i_tag.next_sibling
                if siguiente:
                    titulo = limpiar(str(siguiente)).rstrip(',')
            if "fecha de creación" in texto_i:
                # Buscar el año en todos los hermanos siguientes hasta encontrarlo
                siguiente = i_tag.next_sibling
                max_busca = 5
                while siguiente and max_busca > 0:
                    texto = limpiar(str(siguiente))
                    anio_match = re.search(r"(19|20)\d{2}", texto)
                    if anio_match:
                        anio = anio_match.group(0)
                        break
                    siguiente = siguiente.next_sibling
                    max_busca -= 1
        if titulo:
            resultados.append({
                "NodoHijo": "Obras o productos",
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total OBRAS O PRODUCTOS: {len(resultados)}")
    return resultados

#================================================
# EXTRAER PROYECTOS
#================================================
def extraer_proyectos(soup):
    resultados = []

    # 1️⃣ Buscar la sección Proyectos
    h3 = soup.find("h3", string=re.compile(r"Proyectos", re.IGNORECASE))
    if not h3:
        print("⚠️ No se encontró la sección Proyectos")
        return resultados

    # 2️⃣ Recorrer hasta otro h3
    for elem in h3.find_all_next():
        if elem.name == "h3":
            break
        if elem.name != "blockquote":
            continue

        nodo_hijo = ""
        titulo = ""
        anio = ""

        children = list(elem.children)
        for i, child in enumerate(children):
            # Buscar <i>Tipo de proyecto
            if getattr(child, "name", None) == "i" and "Tipo de proyecto" in child.get_text():
                # Buscar el primer <br> después y tomar el texto siguiente como título
                j = i + 1
                while j < len(children):
                    if getattr(children[j], "name", None) == "br":
                        # El texto después del <br>
                        if j + 1 < len(children):
                            posible_titulo = limpiar(children[j + 1])
                            if posible_titulo:
                                titulo = limpiar_titulo(posible_titulo)
                                break
                    j += 1
                # Nodo hijo sigue igual
                if i + 1 < len(children):
                    nodo_hijo = limpiar(children[i + 1]).replace(",", "")

            # Buscar año en cualquier texto plano
            if isinstance(child, str):
                texto = limpiar(child)
                if not texto:
                    continue
                anio_match = re.search(r"\b(19|20)\d{2}\b", texto)
                if anio_match:
                    anio = anio_match.group()

        if titulo:
            resultados.append({
                "NodoHijo": nodo_hijo,
                "Titulo_proyecto": titulo,
                "año": anio
            })
    print(f"✅ Total PROYECTOS: {len(resultados)}")
    return resultados



def guardar_csv(filas):
    archivo = "cv_datos_generales.csv"
    existe = os.path.exists(archivo)

    with open(archivo, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "categoria",
                "nombre",
                "sexo",
                "UltimaFormacionAcademica",
                "NodoHijo",
                "nodo_padre",
                "Titulo_proyecto",
                "año"
            ]
        )

        # 🔹 Escribir encabezado SOLO si el archivo no existe
        if not existe:
            writer.writeheader()

        writer.writerows(filas)

def main():
        
    print("Iniciando scraping CVLAC...")

    html = obtener_html()
    with open("debug.html", "w", encoding="utf-8") as f:
        f.write(html)

    # `html.parser` evita mojibake con páginas ISO-8859-1 de CVLAC (caso Walter)
    soup = BeautifulSoup(html, "html.parser")

    # -----------------------------
    # Inicializar variables
    # -----------------------------
    filas_csv = []  # Para guardar todo antes de exportar CSV
    filas_mysql = []  # Para la base de datos

    # -----------------------------
    # Extraer secciones
    # -----------------------------
    datos_generales = extraer_datos_generales(soup)
    extra_formacion = extraer_ultima_formacion_academica(soup)
    trabajos = extraer_trabajos_dirigidos(soup)
    ediciones_reviciones = extraer_ediciones_revisiones(soup)
    consultorias = extraer_consultorias(soup)
    eventos = extraer_eventos(soup)
    redes_conocimiento = extraer_redes_conocimiento(soup)
    apropiacion_social = extraer_apropiacion_social(soup)
    apropiacion_normatividad = extraer_apropiacion_normatividad(soup)
    cadenas_productivas = extraer_apropiacion_cadenas_productivas(soup)
    contenido_transmedia = extraer_produccion_contenido_transmedia(soup)
    contenido_digital_audiovisual = extraer_contenido_digital_audiovisual(soup)
    desarrollos_web = extraer_desarrollos_web(soup)
    articulos = extraer_articulos(soup)
    libros = extraer_libros(soup)
    capitulos_libro = extraer_capitulos_libro(soup)
    textos_no_cientificos = extraer_textos_publicaciones_no_cientificas(soup)
    otra_produccion_bibliografica = extraer_otra_produccion_bibliografica(soup)
    innovaciones_gestion_empresarial = extraer_innovaciones_gestion_empresarial(soup)
    documentos_trabajo = extraer_documentos_trabajo(soup)
    otra_produccion_bibliografica_detallada = extraer_otra_produccion_bibliografica_detallada(soup)
    patentes = extraer_patentes(soup)
    secretos_empresariales = extraer_secretos_empresariales(soup)
    software = extraer_software(soup)
    otros_productos_tecnologicos = extraer_otros_productos_tecnologicos(soup)
    prototipos_industriales = extraer_prototipos_industriales(soup)
    innovacion_procesos = extraer_innovacion_procesos(soup)
    reglamentos = extraer_reglamentos(soup)
    informes_tecnicos = extraer_informes_tecnicos(soup)
    conceptos_tecnicos = extraer_conceptos_tecnicos(soup)
    informes_finales_investigacion = extraer_informes_finales_investigacion(soup)
    eventos_artistico = extraer_eventos_artistico(soup)
    obras_productos = extraer_obras_productos(soup)
    proyectos = extraer_proyectos(soup)
    

    # -----------------------------
    # Construir filas_csv
    # -----------------------------
    secciones = [
        (trabajos, "Titulo_proyecto"),
        (consultorias, "Titulo_proyecto"),
        (ediciones_reviciones, "Titulo_proyecto"),
        (eventos, "Titulo_proyecto"),
        (redes_conocimiento, "Titulo_proyecto"),
        (apropiacion_social, "Titulo_producto"),
        (apropiacion_normatividad, "Titulo_producto"),
        (cadenas_productivas, "Titulo_producto"),
        (contenido_transmedia, "Titulo_producto"),
        (contenido_digital_audiovisual, "Titulo_proyecto"),
        (desarrollos_web, "Titulo_producto"),
        (articulos, "Titulo_proyecto"),
        (libros, "Titulo_proyecto"),
        (capitulos_libro, "Titulo_proyecto"),
        (textos_no_cientificos, "Titulo_proyecto"),
        (otra_produccion_bibliografica, "Titulo_proyecto"),
        (innovaciones_gestion_empresarial, "Titulo_proyecto"),
        (documentos_trabajo, "Titulo_documento"),
        (otra_produccion_bibliografica_detallada, "Titulo_proyecto"),
        (patentes, "Titulo_patente"),
        (secretos_empresariales, "Titulo_secreto"),
        (software, "Titulo_proyecto"),
        (otros_productos_tecnologicos, "Titulo_proyecto"),
        (prototipos_industriales, "Titulo_prototipo"),
        (innovacion_procesos, "Titulo_proyecto"),
        (reglamentos, "Titulo_reglamento"),
        (informes_tecnicos, "Titulo_proyecto"),
        (conceptos_tecnicos, "Titulo_proyecto"),
        (informes_finales_investigacion, "Titulo_proyecto"),
        (eventos_artistico, "Titulo_evento"),
        (obras_productos, "Titulo_proyecto"),
        (proyectos, "Titulo_proyecto"),
    ]

    # Debug: mostrar cantidad de registros por sección
    print("\n📊 Cantidad de registros por sección:")
    for i, (seccion, _) in enumerate(secciones):
        print(f"  {i+1}. {len(seccion)} registros")

    for seccion, campo_titulo in secciones:
        for item in seccion:
            filas_csv.append({
                "categoria": datos_generales.get("categoria", ""),
                "nombre": datos_generales.get("nombre", ""),
                "sexo": datos_generales.get("sexo", ""),
                "UltimaFormacionAcademica": extra_formacion.get("UltimaFormacionAcademica", ""),
                "NodoHijo": item.get("NodoHijo", ""),
                "nodo_padre": obtener_nodo_padre(item.get("NodoHijo", "")),
                "Titulo_proyecto": item.get(campo_titulo, ""),
                "año": item.get("año", "")
            })

    # -----------------------------
    # Guardar CSV
    # -----------------------------
    guardar_csv(filas_csv)
    print(f"✓ {len(filas_csv)} registros guardados en cvlac_completo.csv")

    # -----------------------------
    # Preparar filas para MySQL y guardar
    # -----------------------------
    for fila in filas_csv:
        filas_mysql.append({
            "categoria": fila["categoria"],
            "nombre": fila["nombre"],
            "sexo": fila["sexo"],
            "grado": fila["UltimaFormacionAcademica"],
            "tipo_proyecto": fila["NodoHijo"],
            "nodo_padre": obtener_nodo_padre(fila["NodoHijo"]),
            "titulo_proyecto": fila["Titulo_proyecto"],
            "anio": fila["año"]
        })
    return filas_mysql

if __name__ == "__main__":
    # Si se pasa una URL como argumento, solo procesa esa URL y NO toca la base de datos
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
        print(f"🔎 Modo prueba: procesando solo {test_url}")
        URL = test_url
        main()  # Esto solo genera el CSV, no guarda en MySQL ni marca nada
        print("✅ Prueba finalizada. Revisa el archivo cv_datos_generales.csv")
    else:

        # obtener todas las URLs pendientes de la tabla investigadores
        URLS = obtener_urls_db()
        print(f"📋 Se encontraron {len(URLS)} URLs pendientes de procesar")
        
        if len(URLS) == 0:
            print("⚠️ No hay URLs pendientes. Todas ya fueron procesadas.")
            print("Si necesitas procesar de nuevo, ejecuta en MySQL:")
            print("UPDATE investigadores SET estado='pendiente' WHERE link_cvlac IS NOT NULL;")
            exit()

        # 🔥 1️⃣ Limpiar tabla SOLO UNA VEZ
        limpiar_tabla()

        todos_los_datos = []

        for idx, (investigator_id, url) in enumerate(URLS, 1):
            print(f"\n[{idx}/{len(URLS)}] Procesando CVLAC: {url} (investigador {investigator_id})")
            URL = url
            datos = main()
            if datos:
                print(f"  -> Se extrajeron {len(datos)} registros")
                for row in datos:
                    row["id_investigador"] = investigator_id
                todos_los_datos.extend(datos)
            else:
                print(f"  -> No se extrajeron datos de esta URL")
            try:
                conn_update = get_connection()
                cur_update = conn_update.cursor()
                cur_update.execute(
                    "UPDATE investigadores SET estado = 'procesado' WHERE id_investigador = %s",
                    (investigator_id,)
                )
                conn_update.commit()
                print(f"  ✅ Marcado como procesado")
                cur_update.close()
                conn_update.close()
            except Exception as e:
                print(f"  ❌ Error al marcar como procesado: {e}")

        print(f"\n📊 Total de datos recolectados: {len(todos_los_datos)}")
        if todos_los_datos:
            asegurar_columna_nodo_padre()
            guardar_en_mysql(todos_los_datos)
        else:
            print("⚠️ No hay datos para guardar en la base de datos")

        print(f"\n🚀 Proceso finalizado. Total registros insertados: {len(todos_los_datos)}")
        print("\nℹ️ Scraping CVLAC finalizado. El pipeline de normalización se ejecuta desde el backend.")