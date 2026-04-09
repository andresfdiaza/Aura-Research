// backend/repository/tablaNormalizadaFinalRepository.js
const pool = require('../db');

exports.getTablaNormalizadaFinal = async (filters, dataScope = {}) => {
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

  if (Array.isArray(dataScope.facultades) && dataScope.facultades.length > 0) {
    conditions.push(`facultad IN (${dataScope.facultades.map(() => '?').join(',')})`);
    params.push(...dataScope.facultades);
  }
  if (Array.isArray(dataScope.siglas_grupo) && dataScope.siglas_grupo.length > 0) {
    const groupConditions = dataScope.siglas_grupo.map(() => 'LOWER(COALESCE(sigla_grupo_grouplab, "")) LIKE LOWER(?)');
    conditions.push(`(${groupConditions.join(' OR ')})`);
    params.push(...dataScope.siglas_grupo.map((sigla) => `%${sigla}%`));
  }
  if (Array.isArray(dataScope.id_investigadores) && dataScope.id_investigadores.length > 0) {
    conditions.push(`id_investigador IN (${dataScope.id_investigadores.map(() => '?').join(',')})`);
    params.push(...dataScope.id_investigadores);
  }

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
