// backend/repository/resultadosRepository.js
const pool = require('../db');

exports.getResultados = async (filters, dataScope = {}) => {
  const { facultad, programa, anio, investigador, tipo, categoria, tipologia, titulo_proyecto } = filters;
  const conditions = [];
  const params = [];

  // Scope enforced by role mapping in users table.
  if (Array.isArray(dataScope.facultades) && dataScope.facultades.length > 0) {
    conditions.push(`r.facultad IN (${dataScope.facultades.map(() => '?').join(',')})`);
    params.push(...dataScope.facultades);
  }
  if (Array.isArray(dataScope.siglas_grupo) && dataScope.siglas_grupo.length > 0) {
    const groupConditions = dataScope.siglas_grupo.map(() => 'LOWER(COALESCE(r.sigla_grupo, "")) LIKE LOWER(?)');
    conditions.push(`(${groupConditions.join(' OR ')})`);
    params.push(...dataScope.siglas_grupo.map((sigla) => `%${sigla}%`));
  }
  if (Array.isArray(dataScope.id_investigadores) && dataScope.id_investigadores.length > 0) {
    conditions.push(`r.id_investigador IN (${dataScope.id_investigadores.map(() => '?').join(',')})`);
    params.push(...dataScope.id_investigadores);
  }

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
    conditions.push('(r.nombre LIKE ? OR r.nombre_completo LIKE ?)');
    params.push(`%${investigador}%`, `%${investigador}%`);
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
  const whereClause = conditions.length ? (' WHERE ' + conditions.join(' AND ')) : '';
  const sql = `SELECT r.* FROM vista_productos_final r${whereClause}`;
  const [rows] = await pool.query(sql, params);
  return rows;
};
