// backend/repository/tablaNormalizadaFinalRepository.js
const pool = require('../db');

exports.getTablaNormalizadaFinal = async (filters) => {
  const { facultad, programa } = filters;
  let sql = `SELECT
      facultad,
      programa_academico AS programa,
      categoria,
      nombre,
      tipo_proyecto,
      nodo_padre_grouplab AS nodo_padre,
      titulo_proyecto,
      anio,
      tipo_grouplab,
      nodo_padre_grouplab,
      autor_1_grouplab,
      autor_2_grouplab,
      autor_3_grouplab,
      autor_4_grouplab,
      autor_5_grouplab,
      issn,
      isbn,
      revista,
      nombre_grupo_grouplab,
      sigla_grupo_grouplab
    FROM scraping.tabla_normalizada_final`;
  const conditions = [];
  const params = [];
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (programa) {
     conditions.push('programa_academico LIKE ?');
     params.push(`%${programa}%`);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  const [rows] = await pool.query(sql, params);
  return rows;
};
