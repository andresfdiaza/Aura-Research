const pool = require('./db');
const fs = require('fs');

async function poblarInvestigadorTitulo() {
  try {
    const sql = fs.readFileSync(__dirname + '/poblar_investigador_titulo.sql', 'utf8');
    const [result] = await pool.query(sql);
    console.log('Relaciones insertadas correctamente:', result.affectedRows);
  } catch (err) {
    console.error('Error al poblar investigador_titulo:', err);
  } finally {
    await pool.end();
  }
}

poblarInvestigadorTitulo();
