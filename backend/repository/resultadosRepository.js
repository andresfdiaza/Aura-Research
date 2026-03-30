// backend/repository/resultadosRepository.js
const pool = require('../db');

exports.getResultados = async (filters) => {
  const { facultad, programa, anio, investigador, tipo, categoria, tipologia, titulo_proyecto } = filters;
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
