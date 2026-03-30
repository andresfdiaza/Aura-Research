const pool = require('../db');

async function createInvestigador({ nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid }) {
  const [result] = await pool.query(
    'INSERT INTO investigadores (nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre_completo, cedula || null, link_cvlac || null, correo || null, google_scholar || null, orcid || null]
  );
  return result.insertId;
}

async function insertFacultadIfNotExists(nombre_facultad) {
  await pool.query('INSERT IGNORE INTO facultad (nombre_facultad) VALUES (?)', [nombre_facultad]);
  const [facRows] = await pool.query('SELECT id_facultad FROM facultad WHERE nombre_facultad = ?', [nombre_facultad]);
  return facRows[0]?.id_facultad;
}

async function getProgramaId(nombre_programa, id_facultad) {
  const [progRows] = await pool.query(
    'SELECT id_programa FROM programa WHERE nombre_programa = ? AND id_facultad = ?',
    [nombre_programa, id_facultad]
  );
  return progRows[0]?.id_programa;
}

async function insertInvestigadorProgramaFacultad(id_investigador, id_programa, id_facultad) {
  await pool.query(
    'INSERT IGNORE INTO investigador_programa_facultad (id_investigador, id_programa, id_facultad) VALUES (?, ?, ?)',
    [id_investigador, id_programa, id_facultad]
  );
}

async function insertInvestigadorGrupo(id_investigador, id_grupo) {
  await pool.query(
    'INSERT INTO investigador_grupo (id_investigador, id_grupo) VALUES (?, ?)',
    [id_investigador, id_grupo]
  );
}

module.exports = {
  createInvestigador,
  insertFacultadIfNotExists,
  getProgramaId,
  insertInvestigadorProgramaFacultad,
  insertInvestigadorGrupo,
};const pool = require('../db');

// ensures that the scraping-specific columns/table exist
async function ensureScrapingTable() {
  // create the table if it doesn't exist (minimal version)
  const createSql = `
    CREATE TABLE IF NOT EXISTS investigadores (
      id_investigador INT AUTO_INCREMENT PRIMARY KEY
    ) ENGINE=InnoDB;
  `;
  await pool.query(createSql);

  // add scraping columns if they don't already exist
  // check existing columns so we only add missing ones
  const colsToAdd = [
    { name: 'nombre_completo', def: 'VARCHAR(255)' },
    { name: 'link_cvlac', def: 'VARCHAR(255)' },
    { name: 'estado', def: "VARCHAR(20) DEFAULT 'pendiente'" },
    { name: 'fecha_creacion', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
  ];

  for (const col of colsToAdd) {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE table_schema = DATABASE() AND table_name = 'investigadores' AND column_name = ?",
      [col.name]
    );
    if (rows[0].cnt === 0) {
      const sql = `ALTER TABLE investigadores ADD COLUMN ${col.name} ${col.def}`;
      await pool.query(sql);
      console.log(`added column ${col.name}`);
    }
  }
}

// mark all rows that have a link as pending so scraping script will pick them up
async function markAllPending() {
  const sql = "UPDATE investigadores SET estado='pendiente' WHERE link_cvlac IS NOT NULL";
  await pool.query(sql);
}

// export both functions
// Poblar la tabla investigador_titulo usando el SQL existente
async function poblarInvestigadorTitulo() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../poblar_investigador_titulo.sql'), 'utf8');
  await pool.query('DELETE FROM investigador_titulo');
  const [result] = await pool.query(sql);
  console.log('Relaciones insertadas correctamente:', result.affectedRows);
}

module.exports = {
  ensureScrapingTable,
  markAllPending,
  poblarInvestigadorTitulo,
};
