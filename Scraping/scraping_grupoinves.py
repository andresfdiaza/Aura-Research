import html
import requests  #sirve para hacer solicitudes HTTP
import csv  # sirve para escribir archivos CSV
import re # busca patrones en el texto y extraer información específica y reducir espacios extra
import time
from bs4 import BeautifulSoup
import os
import unicodedata
import mysql.connector
import subprocess
import sys

URL = 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000005830'

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

# Mapeo de secciones a sus funciones extractoras
SECCIONES_PROCESADAS = {
    "Artículos publicados": "articulos",
    "Libros publicados": "libros",
    "Capítulos de libro publicados": "capitulos_libro",
    "Documentos de trabajo": "documentos_trabajo",
    "Otra publicación divulgativa": "publicacion_divulgat iva",
    "Otros artículos publicados": "otros_articulos",
    "Conceptos técnicos": "conceptos_tecnicos",
    "Informes técnicos": "informes_tecnicos",
    "Innovaciones en Procesos y Procedimientos": "innovaciones_procesos",
    "Innovaciones generadas en la Gestión Empresarial": "innovaciones_gestion_empresarial",
    "Otros productos tecnológicos": "otros_productos_tecnologicos",
    "Prototipos": "prototipos",
    "Softwares": "softwares",
    "Producciones de contenido digital - Audiovisual": "contenido_digital_audiovisual",
    "Divulgación Pública de la Ciencia producción de estrategias y contenidos transmedia": "divulgacion_transmedia",
    "Desarrollo web": "desarrollo_web",
    "Procesos de apropiación social del Conocimiento para el fortalecimiento o solución de asuntos de interés social": "apropiacion_social_asuntos",
    "Proceso de apropiación social del Conocimiento para el fortalecimiento de cadenas productivas": "apropiacion_social_cadenas",
    "Consultorías científico-tecnológicas": "consultorias_cientifico_tecnologicas",
    "Ediciones": "ediciones",
    "Eventos Científicos": "eventos_cientificos",
    "Informes de investigación": "informes_investigacion",
    "Redes de Conocimiento Especializado": "redes_conocimiento_especializado",
    "Generación de Contenido Impreso": "contenido_impreso",
    "Generación de Contenido Multimedia": "contenido_multimedia",
    "Generación de Contenido Virtual": "contenido_virtual",
    "Estrategias de Comunicación del Conocimiento": "estrategias_comunicacion_conocimiento",
    "Estrategias Pedagógicas para el fomento a la CTI": "estrategias_pedagogicas_cti",
    "Participación Ciudadana en Proyectos de CTI": "participacion_ciudadana_cti",
    "Trabajos dirigidos/turorías": "trabajos_dirigidos_tutorias",
    "Proyectos": "proyectos",
    "Libros de formación": "libros_formacion",
}

# Mapeo de NodoHijo (scraping) -> NodoPadre (TipologiaProductos)
# Alineado con scraping_cvlac_completo.py
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
    "Trabajo dirigido de grado de maestría o especialidad clínica": "Formación del Recurso Humano",
    "Trabajo dirigido de grado de pregrado": "Formación del Recurso Humano",
    # Tipos específicos extraídos del HTML de GrupLAC (sin "dirigido")
    "Trabajos de grado de pregrado": "Formación del Recurso Humano",
    "Trabajo de grado de maestría o especialidad clínica": "Formación del Recurso Humano",
    "Trabajos dirigidos/Tutorías de otro tipo": "Formación del Recurso Humano",
    "Tesis de doctorado": "Formación del Recurso Humano",
    "Investigación y desarrollo": "Formación del Recurso Humano",
    "Investigación desarrollo e Innovación": "Formación del Recurso Humano",
    "Extensión y responsabilidad social CTI": "Formación del Recurso Humano",
    "Trabajo dirigido de conclusión de curso de perfeccionamiento/especialización": "Formación del Recurso Humano",
    # Tipos de divulgación adicionales
    "redes conocimiento especializado": "Divulgación Pública de la Ciencia",
    "contenido impreso": "Divulgación Pública de la Ciencia",
    "contenido multimedia": "Divulgación Pública de la Ciencia",
    "contenido virtual": "Divulgación Pública de la Ciencia",
    "estrategias comunicacion conocimiento": "Divulgación Pública de la Ciencia",
    "estrategias pedagogicas cti": "Divulgación Pública de la Ciencia",
    "participacion ciudadana cti": "Divulgación Pública de la Ciencia",
}

NODO_HIJO_ALIAS_MAP = {
    "articulo": "Artículo",
    "articulos": "Artículo",
    "artículos": "Artículo",
    "arituculo": "Artículo",
    "libros": "Libro",
    "capitulos libro": "Capítulos de libro",
    "capítulos de libro": "Capítulos de libro",
    "documentos trabajo": "Documento de trabajo",
    "otros articulos": "Textos en publicaciones no científicas",
    "otros artículos": "Textos en publicaciones no científicas",
    "publicacion divulgativa": "Otra producción bibliográfica",
    "publicación divulgativa": "Otra producción bibliográfica",
    "informes tecnicos": "Informe técnico",
    "informes técnicos": "Informe técnico",
    "innovaciones procesos": "Innovación de proceso o procedimiento",
    "innovaciones gestion empresarial": "Innovaciones generadas de producción empresarial",
    "innovaciones gestión empresarial": "Innovaciones generadas de producción empresarial",
    "otros productos tecnologicos": "Otros productos tecnológicos",
    "otros productos tecnológicos": "Otros productos tecnológicos",
    "prototipos": "Prototipo industrial",
    "softwares": "Software",
    "contenido digital audiovisual": "Producción de estrategias y contenidos transmedia",
    "divulgacion transmedia": "Producción de estrategias y contenidos transmedia",
    "divulgación transmedia": "Producción de estrategias y contenidos transmedia",
    "desarrollo web": "Desarrollos web",
    "apropiacion social asuntos": "Proceso de Apropiación Social del Conocimiento para el fortalecimiento o solución de asuntos de interés social",
    "apropiación social asuntos": "Proceso de Apropiación Social del Conocimiento para el fortalecimiento o solución de asuntos de interés social",
    "apropiacion social cadenas": "Proceso de Apropiación Social del Conocimiento para el fortalecimiento de cadenas",
    "apropiación social cadenas": "Proceso de Apropiación Social del Conocimiento para el fortalecimiento de cadenas",
    "consultorias cientifico tecnologicas": "Consultoría Científico Tecnológica e Informe Técnico",
    "consultorías científico tecnológicas": "Consultoría Científico Tecnológica e Informe Técnico",
    "ediciones": "Documento de trabajo",
    "eventos cientificos": "Evento científico",
    "eventos científicos": "Evento científico",
    "informes investigacion": "Informes finales de investigación",
    "informes investigación": "Informes finales de investigación",
    "trabajos dirigidos tutorias": "Trabajo dirigido de grado de pregrado",
    "trabajos dirigidos tutorías": "Trabajo dirigido de grado de pregrado",
    "proyectos": "Investigación y desarrollo",
    "libros formacion": "Libro",
    "libros formación": "Libro",
}

def normalizar_nodo_hijo(tipo):
    """Normaliza variantes de NodoHijo para mantener consistencia entre scripts."""
    if not tipo:
        return ""

    base = tipo.replace("_", " ").strip()
    clave = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii").lower()

    if clave in NODO_HIJO_ALIAS_MAP:
        return NODO_HIJO_ALIAS_MAP[clave]

    return base

def obtener_nodo_padre(nodo_hijo):
    """Obtiene el nodo padre para un NodoHijo canónico."""
    return NODO_PADRE_MAP.get(nodo_hijo, "")


def obtener_html():
    """Obtiene el HTML de la página de GrupLAC"""
    session = requests.Session()
    session.headers.update(HEADERS)

    for intento in range(5):
        print(f"Intento {intento + 1} de conexión...")
        response = session.get(URL, timeout=30)

        if response.status_code == 200:
            # Decodificar manualmente desde bytes
            html_content = response.content.decode("latin-1")
            return html_content

        print(f"Servidor respondió {response.status_code}, esperando...")
        time.sleep(5)

    raise Exception("No fue posible acceder a CVLAC (bloqueo del servidor)")


def extraer_titulos(html):
    """Extrae títulos de las secciones del HTML parseado."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Encontrar todas las tablas que contienen secciones
    tablas = soup.find_all("table", style=lambda x: x and "border:#999 1px solid" in x)
    
    resultados = {
        "articulos": [],
        "libros": [],
        "capitulos_libro": [],
        "documentos_trabajo": [],
        "publicacion_divulgativa": [],
        "otros_articulos": [],
        "conceptos_tecnicos": [],
        "informes_tecnicos": [],
        "innovaciones_procesos": [],
        "innovaciones_gestion_empresarial": [],
        "otros_productos_tecnologicos": [],
        "prototipos": [],
        "softwares": [],
        "contenido_digital_audiovisual": [],
        "divulgacion_transmedia": [],
        "desarrollo_web": [],
        "apropiacion_social_asuntos": [],
        "apropiacion_social_cadenas": [],
        "consultorias_cientifico_tecnologicas": [],
        "ediciones": [],
        "eventos_cientificos": [],
        "informes_investigacion": [],
        "redes_conocimiento_especializado": [],
        "contenido_impreso": [],
        "contenido_multimedia": [],
        "contenido_virtual": [],
        "estrategias_comunicacion_conocimiento": [],
        "estrategias_pedagogicas_cti": [],
        "participacion_ciudadana_cti": [],
        "trabajos_dirigidos_tutorias": [],
        "proyectos": [],
        "libros_formacion": []
    }
    
    for tabla in tablas:
        # Buscar el encabezado de la sección
        encabezado_td = tabla.find("td", class_="celdaEncabezado", attrs={"colspan": "2"})
        
        if not encabezado_td:
            continue
        
        nombre_seccion = encabezado_td.get_text(strip=True)
        
        # Identificar qué tipo de sección es
        tipo_seccion = None
        for nombre_conocido, tipo in SECCIONES_PROCESADAS.items():
            if nombre_conocido.lower() == nombre_seccion.lower():
                tipo_seccion = tipo
                break
        
        # Si no es una sección que reconocemos, saltamos
        if not tipo_seccion:
            print(f"⊘ Sección no procesada: {nombre_seccion}")
            continue
        
        print(f"✓ Procesando: {nombre_seccion}")
        
        # Extraer títulos de esta sección
        titulos_seccion = extraer_titulos_de_seccion(tabla, tipo_seccion)
        resultados[tipo_seccion] = titulos_seccion
        print(f"  → {len(titulos_seccion)} elementos encontrados")
    
    return resultados


def extraer_info_grupo(html_content):
    """Extrae nombre y sigla del grupo desde el encabezado principal de GroupLAC."""
    soup = BeautifulSoup(html_content, "html.parser")
    encabezado = soup.find("span", class_="celdaEncabezado")

    if not encabezado:
        return {"nombre_grupo": "", "sigla_grupo": ""}

    nombre_grupo = encabezado.get_text(" ", strip=True)
    nombre_grupo = html.unescape(nombre_grupo)
    nombre_grupo = re.sub(r"\s+", " ", nombre_grupo).strip()

    # La sigla suele venir al final (ej. GI2A). Si no existe, queda vacía.
    sigla_match = re.search(r"\b([A-Z][A-Z0-9]{1,})\b$", nombre_grupo)
    sigla_grupo = sigla_match.group(1) if sigla_match else ""

    return {
        "nombre_grupo": nombre_grupo,
        "sigla_grupo": sigla_grupo,
    }


def extraer_titulos_de_seccion(tabla, tipo_seccion=None):
    """Extrae todos los títulos y autores de una tabla de sección específica."""
    registros = []
    
    # Buscar todas las filas con datos (después del encabezado)
    filas = tabla.find_all("tr")
    
    # Saltamos la primera fila (es el encabezado)
    for fila in filas[1:]:
        celda_datos = None
        clases_validas = {"celdas0", "celdas1", "celdas_0", "celdas_1"}
        candidatas = []

        for td in fila.find_all("td"):
            clases_td = td.get("class", [])
            if any(c in clases_validas for c in clases_td):
                candidatas.append(td)

        # Priorizar la celda que contiene el contenido real (normalmente la que tiene <strong>)
        for td in candidatas:
            if td.find("strong") is not None:
                celda_datos = td
                break

        # Fallback si no hay <strong>
        if celda_datos is None and candidatas:
            celda_datos = candidatas[-1]
        
        if not celda_datos:
            continue
        
        # Extraer título y autores
        datos = extraer_datos_de_celda(celda_datos, tipo_seccion)
        
        if datos:
            registros.append(datos)
    
    return registros


def extraer_datos_de_celda(celda, tipo_seccion=None):
    """Extrae el título, autores, ISSN, ISBN, año y revista/libro de una celda individual."""
    
    # Obtener todo el texto de la celda
    texto_completo = celda.get_text(" ", strip=True)
    
    # Decodificar entidades HTML
    texto_completo = html.unescape(texto_completo)
    
    # Extraer año de publicación (diferente según el tipo)
    ano = None
    
    # Para artículos y otros artículos: buscar el año inmediatamente antes de "vol:"
    if tipo_seccion in ["articulos", "otros_articulos"]:
        match_ano_articulo = re.search(
            r'ISSN:[^,]*,\s*((19|20)\d{2})\s+vol:',
            texto_completo,
            re.IGNORECASE,
        )
        if match_ano_articulo:
            ano = match_ano_articulo.group(1)
        else:
            # Fallback: buscar patrón 19XX o 20XX
            match_ano = re.search(r'\b(19|20)\d{2}\b', texto_completo)
            if match_ano:
                ano = match_ano.group(0)
    else:
        # Para otros tipos: buscar el primer año
        match_ano = re.search(r'\b(19|20)\d{2}\b', texto_completo)
        if match_ano:
            ano = match_ano.group(0)
    
    # Extraer autores si están presentes
    autores = []
    
    # Caso especial: en trabajos dirigidos vienen como Tutor(es)/Cotutor(es)
    if tipo_seccion == "trabajos_dirigidos_tutorias":
        match_tutores = re.search(
            r'Tutor\(es\)/Cotutor\(es\):\s*(.+?)(?=\s*(?:Nro\.?|Número|Institución|Programa|Año:|$))',
            texto_completo,
            re.IGNORECASE,
        )
        if match_tutores:
            texto_tutores = match_tutores.group(1).strip()
            autores = [a.strip() for a in re.split(r',|;', texto_tutores) if a.strip()]

    # Fallback general por etiqueta "Autores:"
    if not autores:
        match_autores = re.search(r'Autores:\s*([^\n]+)', texto_completo, re.IGNORECASE)
        if match_autores:
            texto_autores = match_autores.group(1).strip()
            # Dividir por comas y limpiar
            autores = [a.strip() for a in texto_autores.split(',') if a.strip()]
    
    # Extraer ISSN y nombre de revista solo para artículos
    issn = None
    revista = None
    if tipo_seccion == "articulos":
        match_issn = re.search(r'ISSN:\s*([\d-]+)', texto_completo, re.IGNORECASE)
        if match_issn:
            issn = match_issn.group(1).strip()
        
        # Extraer nombre de revista (texto entre primera coma y "ISSN:")
        match_revista = re.search(r',\s*([^,]+?)\s+ISSN:', texto_completo, re.IGNORECASE)
        if match_revista:
            revista = match_revista.group(1).strip()
    
    # Extraer ISBN y nombre del libro para capítulos de libro y libros
    isbn = None
    if tipo_seccion in ["capitulos_libro", "libros"]:
        match_isbn = re.search(r'ISBN:\s*([\d-]+)', texto_completo, re.IGNORECASE)
        if match_isbn:
            isbn = match_isbn.group(1).strip()
        
        # Extraer nombre del libro (texto entre segunda coma y "ISBN:")
        # Patrón: País, año, NOMBRE_LIBRO, ISBN:
        match_libro = re.search(r',\s*\d{4}\s*,\s*([^,]+?)\s*,\s*ISBN:', texto_completo, re.IGNORECASE)
        if match_libro:
            revista = match_libro.group(1).strip()
    
    # Buscar la etiqueta de tipo de publicación (<strong> o <b>)
    marcador_tipo = celda.find("strong") or celda.find("b")
    
    tipo_especifico = None  # Para trabajos dirigidos/tutorías
    
    if marcador_tipo:
        # Para trabajos dirigidos/tutorías: extraer tipo del patrón "N.- Tipo :" del texto completo
        if tipo_seccion == "trabajos_dirigidos_tutorias":
            # Buscar en el texto completo de la celda, no solo en el <strong>
            # Patrón: "5.- Trabajos de grado de pregrado :" o "7.- Trabajo de grado de maestría o especialidad clínica :"
            match_tipo = re.search(r'\d+\.-\s*(.+?)\s*:', texto_completo)
            if match_tipo:
                tipo_especifico = match_tipo.group(1).strip()
        
        # Extraer texto solo hasta el primer <br/> recorriendo hermanos del marcador
        fragmentos = []
        for hermano in marcador_tipo.next_siblings:
            if getattr(hermano, "name", None) == "br":
                break
            if isinstance(hermano, str):
                texto = hermano.strip()
                if texto:
                    fragmentos.append(texto)
            else:
                texto = hermano.get_text(" ", strip=True)
                if texto:
                    fragmentos.append(texto)

        titulo = " ".join(fragmentos).strip()
        
        # Quitar : inicial si existe
        if titulo.startswith(":"):
            titulo = titulo[1:].strip()
        
        # Caso especial reportado: "Formato Redcolsi: Virtual Biology"
        if tipo_seccion == "documentos_trabajo":
            match_redcolsi = re.search(r'^Formato\s+Redcolsi\s*:\s*(.+)$', titulo, re.IGNORECASE)
            if match_redcolsi:
                titulo = match_redcolsi.group(1).strip()

        # Caso especial: en audiovisual puede venir con prefijo "Webinar:"
        if tipo_seccion == "contenido_digital_audiovisual":
            match_prefijo = re.search(r'^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\-\s\(\)]+:\s*(.+)$', titulo)
            if match_prefijo:
                titulo = match_prefijo.group(1).strip()
        
        # Buscar patrón de año (19XX o 20XX seguido de espacios/comas)
        patron_ano = r'\s+(19|20)\d{2}\s*(?:vol:|fasc:|págs:|,|Nro\.|$)'
        match_ano = re.search(patron_ano, titulo)
        
        if match_ano:
            # Tomar todo hasta antes del año
            titulo = titulo[:match_ano.start()].strip()
        else:
            # Si no hay año visible, buscar palabras clave de metadatos
            patron_metadata = r'\s*(?:ISSN|DOI|ISBN|vol:|fasc:|págs:|Ed\.|autores|ed\.|Nro\.|Año:)'
            match_metadata = re.search(patron_metadata, titulo, re.IGNORECASE)
            
            if match_metadata:
                titulo = titulo[:match_metadata.start()].strip()
        
        titulo = titulo.strip('"""')
        titulo = re.sub(r'\s+', ' ', titulo).strip()

        # Si es muy corto, rechazar (mínimo 5 caracteres para atrapar todos)
        if len(titulo) > 5 and len(titulo) < 500:
            resultado_return = {
                'titulo': titulo,
                'autores': autores,
                'issn': issn,
                'isbn': isbn,
                'revista': revista,
                'ano': ano
            }
            # Si se extrajo tipo específico (para trabajos dirigidos), agregarlo
            if tipo_especifico:
                resultado_return['tipo_especifico'] = tipo_especifico
            
            return resultado_return
    
    return None


def conectar_bd():
    """Conecta a la base de datos MySQL"""
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Amaamama12345.",
        database="scraping",
        charset='utf8mb4',
        use_unicode=True
    )


def crear_tabla():
    """Recrea la tabla titulo_grouplab con tipo, titulo y columnas de autores"""
    conexion = conectar_bd()
    cursor = conexion.cursor()

    # cursor.execute("DROP TABLE IF EXISTS titulo_grouplab")  # Eliminado para no borrar la tabla
    
    # Ya no se recrea la tabla, solo se usa la existente
    print("✓ Usando tabla 'titulo_grouplab' existente para agregar datos nuevos.")
    cursor.close()
    conexion.close()


def crear_tabla_tipologia_proyecto():
    """Crea la tabla tipologia_proyecto con tipo y nodo padre"""
    conexion = conectar_bd()
    cursor = conexion.cursor()

    # cursor.execute("DROP TABLE IF EXISTS tipologia_proyecto")  # Eliminado para no borrar la tabla
    
    # Ya no se recrea la tabla, solo se usa la existente y se agregan datos nuevos si no existen
    for tipo, nodo_padre in NODO_PADRE_MAP.items():
        cursor.execute("SELECT COUNT(*) FROM tipologia_proyecto WHERE tipo = %s", (tipo,))
        existe = cursor.fetchone()[0]
        if existe == 0:
            cursor.execute("INSERT INTO tipologia_proyecto (tipo, nodo_padre) VALUES (%s, %s)", (tipo, nodo_padre))
    conexion.commit()
    cursor.close()
    conexion.close()
    print("✓ Usando tabla 'tipologia_proyecto' existente y agregando solo tipos nuevos.")
    print("✓ Tabla 'tipologia_proyecto' recreada con tipos y nodos padres")


def limpiar_datos_anteriores():
    """Limpia los datos anteriores de la tabla y el CSV"""
    # Limpiar BD
    conexion = conectar_bd()
    cursor = conexion.cursor()
    # cursor.execute("DELETE FROM titulo_grouplab")  # Eliminado para no borrar los datos
    filas_eliminadas = cursor.rowcount
    conexion.commit()
    cursor.close()
    conexion.close()
    print(f"🗑️ Eliminados {filas_eliminadas} títulos anteriores de la BD")
    
    # Limpiar CSV
    archivo_csv = "titulos_grouplab.csv"
    if os.path.exists(archivo_csv):
        os.remove(archivo_csv)
        print("🗑️ Archivo CSV anterior eliminado")


def guardar_en_bd(titulos_por_tipo, info_grupo):
    """Guarda los títulos y autores en la base de datos organizados por tipo"""
    conexion = conectar_bd()
    cursor = conexion.cursor()
    
    query = """INSERT INTO titulo_grouplab 
               (tipo, nodo_padre, nombre_grupo_investigacion, sigla_grupo_investigacion, titulo, autor_1, autor_2, autor_3, autor_4, autor_5, issn, isbn, revista, ano) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    total = 0
    nuevos = 0
    for tipo, registros in titulos_por_tipo.items():
        for registro in registros:
            if 'tipo_especifico' in registro and registro['tipo_especifico']:
                nodo_hijo = registro['tipo_especifico']
            else:
                nodo_hijo = normalizar_nodo_hijo(tipo)
            nodo_padre = obtener_nodo_padre(nodo_hijo)
            nombre_grupo = info_grupo.get('nombre_grupo', '')
            sigla_grupo = info_grupo.get('sigla_grupo', '')
            titulo = registro['titulo']
            autores = registro['autores']
            issn = registro.get('issn')
            isbn = registro.get('isbn')
            revista = registro.get('revista')
            ano = registro.get('ano')
            valores_autores = [None] * 5
            for i, autor in enumerate(autores[:5]):
                valores_autores[i] = autor
            # Verificar si ya existe el registro por sigla_grupo, titulo y año
            cursor.execute("""
                SELECT COUNT(*) FROM titulo_grouplab
                WHERE sigla_grupo_investigacion = %s AND titulo = %s AND ano = %s
            """, (sigla_grupo, titulo, ano))
            existe = cursor.fetchone()[0]
            if existe == 0:
                cursor.execute(query, (nodo_hijo, nodo_padre, nombre_grupo, sigla_grupo, titulo, *valores_autores, issn, isbn, revista, ano))
                nuevos += 1
        total += len(registros)
    conexion.commit()
    cursor.close()
    conexion.close()
    print(f"✓ {nuevos} títulos nuevos guardados en BD (de {total} procesados)")


def guardar_csv(titulos_por_tipo, info_grupo):
    """Guarda los títulos y autores en un archivo CSV organizado por tipo"""
    archivo = "titulos_grouplab.csv"

    with open(archivo, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["tipo", "nodo_padre", "nombre_grupo_investigacion", "sigla_grupo_investigacion", "titulo", "autor_1", "autor_2", "autor_3", "autor_4", "autor_5", "issn", "isbn", "revista", "ano"])  # Encabezados
        
        for tipo, registros in titulos_por_tipo.items():
            for registro in registros:
                # Si hay tipo_especifico (para trabajos dirigidos), usarlo; si no, normalizar
                if 'tipo_especifico' in registro and registro['tipo_especifico']:
                    nodo_hijo = registro['tipo_especifico']
                else:
                    nodo_hijo = normalizar_nodo_hijo(tipo)
                
                nodo_padre = obtener_nodo_padre(nodo_hijo)
                nombre_grupo = info_grupo.get('nombre_grupo', '')
                sigla_grupo = info_grupo.get('sigla_grupo', '')
                titulo = registro['titulo']
                autores = registro['autores']
                issn = registro.get('issn', '')  # Vacío si no hay ISSN
                isbn = registro.get('isbn', '')  # Vacío si no hay ISBN
                revista = registro.get('revista', '')  # Vacío si no hay revista
                ano = registro.get('ano', '')  # Vacío si no hay año
                
                # Preparar valores para hasta 5 autores
                valores_autores = [''] * 5
                for i, autor in enumerate(autores[:5]):  # Tomar máximo 5 autores
                    valores_autores[i] = autor

                writer.writerow([nodo_hijo, nodo_padre, nombre_grupo, sigla_grupo, titulo, *valores_autores, issn, isbn, revista, ano])
    
    ruta_completa = os.path.abspath(archivo)
    total = sum(len(registros) for registros in titulos_por_tipo.values())
    print(f"✓ {total} títulos guardados en CSV: {ruta_completa}")


def main():
    print("\n" + "="*60)
    print("🔬 EXTRACCIÓN DE TÍTULOS Y AUTORES DE GRUPLAC")
    print("="*60 + "\n")
    
    # Crear tablas
    crear_tabla()
    crear_tabla_tipologia_proyecto()
    
    # Limpiar datos anteriores
    print("\n🔄 Limpiando datos anteriores...\n")
    limpiar_datos_anteriores()
    
    # Obtener HTML y extraer títulos
    print("\n📥 Obteniendo datos de GrupLAC...\n")
    html = obtener_html()
    info_grupo = extraer_info_grupo(html)
    if info_grupo.get('nombre_grupo'):
        print(f"✓ Grupo detectado: {info_grupo['nombre_grupo']}")
    if info_grupo.get('sigla_grupo'):
        print(f"✓ Sigla detectada: {info_grupo['sigla_grupo']}")
    titulos_por_tipo = extraer_titulos(html)
    
    # Guardar en BD y CSV
    print("\n💾 Guardando resultados...\n")
    guardar_en_bd(titulos_por_tipo, info_grupo)
    guardar_csv(titulos_por_tipo, info_grupo)
    
    total = sum(len(registros) for registros in titulos_por_tipo.values())
    
    print("\n" + "="*60)
    print(f"✅ COMPLETADO: {total} títulos procesados")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

    # Nota: el postproceso (clean/join/vistas) se ejecuta desde backend/service/scrapingService.js
    # para mantener un único flujo consistente en el orden correcto.
    print("\nℹ️ Scraping GroupLAC finalizado. El pipeline de normalización se ejecuta desde el backend.")
