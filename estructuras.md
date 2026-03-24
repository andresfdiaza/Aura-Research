# Estructuras de las tablas de la base de datos

## facultad
- id_facultad: int, AI, PK
- nombre_facultad: varchar(255)
- created_at: timestamp

## investigador_grupo
- id: int, AI, PK
- id_investigador: int
- id_grupo: int
- created_at: timestamp

## investigador_programa_facultad
- id_relacion: int, AI, PK
- id_investigador: int
- id_programa: int
- id_facultad: int
- created_at: timestamp

## investigador_titulo
- id_relacion: int, AI, PK
- id_investigador: int
- id_titulo: int
- orden_autor: int
- created_at: timestamp

## investigadores
- id_investigador: int, AI, PK
- nombre_completo: varchar(255)
- cedula: varchar(20)
- link_cvlac: varchar(255)
- estado: varchar(20)
- fecha_creacion: timestamp
- correo: varchar(255)
- google_scholar: varchar(255)
- orcid: varchar(255)

## link_grouplab
- id: int, AI, PK
- url: varchar(512)
- id_facultad: int
- nombre_grupo: varchar(255)
- sigla_grupo: varchar(255)

## programa
- id_programa: int, AI, PK
- nombre_programa: varchar(255)
- id_facultad: int
- created_at: timestamp

## resultados
- id: int, AI, PK
- categoria: varchar(255)
- nombre: varchar(255)
- sexo: varchar(50)
- grado: varchar(100)
- tipo_proyecto: varchar(255)
- titulo_proyecto: varchar(3000)
- anio: varchar(4)
- id_investigador: int
- nodo_padre: varchar(255)

## vista_productos_final (VIEW)
- id: int
- categoria: varchar(255)
- nombre: varchar(255)
- sexo: varchar(50)
- grado: varchar(100)
- tipo_proyecto: varchar(255)
- titulo_proyecto: varchar(3000)
- anio: varchar(4)
- id_investigador: int
- nodo_padre: varchar(255)
- facultad: varchar(255)
- programa: mediumtext
- sigla_grupo: mediumtext
- investigador: varchar(255)
- link_cvlac: varchar(255)
- cedula: varchar(20)
- correo: varchar(255)
- google_scholar: varchar(255)
- orcid: varchar(255)
