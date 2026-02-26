const pool = require('../db');

// ensures that the scraping-specific columns/table exist
async function ensureScrapingTable() {
  // create the table if it doesn't exist (minimal version)
  const createSql = `
    CREATE TABLE IF NOT EXISTS investigadores (
      id INT AUTO_INCREMENT PRIMARY KEY
    ) ENGINE=InnoDB;
  `;
  await pool.query(createSql);

  // add scraping columns if they don't already exist
  // check existing columns so we only add missing ones
  const colsToAdd = [
    { name: 'nombre', def: 'VARCHAR(100)' },
    { name: 'link', def: 'TEXT' },
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
  const sql = "UPDATE investigadores SET estado='pendiente' WHERE (link IS NOT NULL OR link_cvlac IS NOT NULL)";
  await pool.query(sql);
}

// export both functions
module.exports = {
  ensureScrapingTable,
  markAllPending,
};
