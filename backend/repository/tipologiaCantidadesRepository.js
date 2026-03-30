// backend/repository/tipologiaCantidadesRepository.js
const pool = require('../db');

exports.getTipologiaCantidades = async (filters) => {
  const { facultad, programa, anio, investigador, tipo, categoria, cedula, sexo, grado, tipologia, titulo_proyecto } = filters;
  let sql = `
    SELECT r.nodo_padre AS tipologia, COUNT(*) AS cantidad
    FROM (
      SELECT *
      FROM (
        SELECT
          v.nodo_padre,
          v.tipo_proyecto,
          v.categoria,
          v.nombre,
          v.investigador,
          v.cedula,
          v.sexo,
          v.grado,
          v.titulo_proyecto,
          v.anio,
          v.facultad,
          v.programa,
          ROW_NUMBER() OVER (
            PARTITION BY
              LOWER(TRIM(REGEXP_REPLACE(COALESCE(v.titulo_proyecto, ''), '[[:space:]]+', ' '))),
              LOWER(TRIM(COALESCE(v.tipo_proyecto, ''))),
              COALESCE(CAST(v.anio AS CHAR), ''),
              LOWER(TRIM(COALESCE(v.nodo_padre, '')))
            ORDER BY v.id
          ) AS rn
        FROM vista_productos_final v
      ) ranked
      WHERE ranked.rn = 1
    ) r
  `;
  const conditions = [];
  const params = [];
  if (facultad) {
    conditions.push('r.facultad = ?');
    params.push(facultad);
  }
  if (programa) {
    conditions.push('r.programa = ?');
    params.push(programa);
  }
  if (anio) {
    conditions.push('r.anio = ?');
    params.push(anio);
  }
  if (investigador) {
    conditions.push('(r.nombre LIKE ? OR r.investigador LIKE ?)');
    params.push(`%${investigador}%`, `%${investigador}%`);
  }
  if (cedula) {
    conditions.push('r.cedula = ?');
    params.push(cedula);
  }
  if (sexo) {
    conditions.push('r.sexo = ?');
    params.push(sexo);
  }
  if (grado) {
    conditions.push('r.grado = ?');
    params.push(grado);
  }
  if (tipo) {
    conditions.push('r.tipo_proyecto = ?');
    params.push(tipo);
  }
  if (categoria) {
    conditions.push('r.categoria = ?');
    params.push(categoria);
  }
  if (tipologia) {
    conditions.push('LOWER(TRIM(r.nodo_padre)) = LOWER(TRIM(?))');
    params.push(tipologia);
  }
  if (titulo_proyecto) {
    conditions.push('r.titulo_proyecto LIKE ?');
    params.push(`%${titulo_proyecto}%`);
  }
  conditions.push('r.nodo_padre IS NOT NULL AND TRIM(r.nodo_padre) <> ""');
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += `
    GROUP BY r.nodo_padre
    ORDER BY cantidad DESC
    LIMIT 5
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
};
