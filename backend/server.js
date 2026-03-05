const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const scrapingController = require('./controller/scrapingController');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Lightweight API request logging for production diagnostics.
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.originalUrl}`, {
      query: req.query,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });
  }
  next();
});

// create users and investigadores tables if not exists
(async () => {
  try {
    const createUsersSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(createUsersSql);
    console.log('users table ensured');

    // Add role column if it doesn't exist
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
      if (cols.length === 0) {
        await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'");
        console.log('Added role column to users table');
      }
    } catch (err) {
      console.error('Error checking/adding role column:', err.message);
    }

    const createInvestigadoresSql = `
      CREATE TABLE IF NOT EXISTS investigadores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_completo VARCHAR(255) NOT NULL,
        cedula VARCHAR(50) UNIQUE,
        link_cvlac VARCHAR(255),
        facultad VARCHAR(255),
        programa_academico VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- columnas adicionales para scraping
        nombre VARCHAR(100),
        link TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(createInvestigadoresSql);
    console.log('investigadores table ensured');

    // Ensure resultados table exists with all required columns
    const ensureResultadosSql = `
      CREATE TABLE IF NOT EXISTS resultados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_investigador INT,
        categoria VARCHAR(255),
        nombre VARCHAR(255),
        sexo VARCHAR(50),
        grado VARCHAR(255),
        tipo_proyecto VARCHAR(255),
        nodo_padre VARCHAR(255),
        titulo_proyecto TEXT,
        anio INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(ensureResultadosSql);
    console.log('resultados table ensured');

    // Add nodo_padre column if it doesn't exist
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM resultados WHERE Field = 'nodo_padre'");
      if (cols.length === 0) {
        await pool.query("ALTER TABLE resultados ADD COLUMN nodo_padre VARCHAR(255)");
        console.log('Added nodo_padre column to resultados table');
      }
    } catch (err) {
      console.error('Error checking/adding nodo_padre column:', err.message);
    }

    // create or refresh the view the frontend will use for exploratory data
    const createViewSql = `
      CREATE OR REPLACE VIEW vista_productos_final AS
      SELECT r.*, i.facultad, i.programa_academico AS programa,
             i.nombre_completo AS investigador
      FROM resultados r
      LEFT JOIN investigadores i ON r.id_investigador = i.id;
    `;
    await pool.query(createViewSql);
    console.log('database view vista_productos_final ensured');

    /*
     * migration: if the table existed with old column names, rename them.
     */
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const names = cols.map(c => c.Field);
      const alterations = [];
      if (names.includes('nombre') && !names.includes('nombre_completo')) {
        alterations.push('CHANGE nombre nombre_completo VARCHAR(255)');
      }
      if (names.includes('link') && !names.includes('link_cvlac')) {
        alterations.push('CHANGE link link_cvlac VARCHAR(255)');
      }
      if (names.includes('programa') && !names.includes('programa_academico')) {
        alterations.push('CHANGE programa programa_academico VARCHAR(255)');
      }
      if (alterations.length > 0) {
        const sql = 'ALTER TABLE investigadores ' + alterations.join(', ');
        await pool.query(sql);
        console.log('migrated investigadores schema:', alterations.join(', '));
      }
    } catch (migrationErr) {
      console.error('Error migrating investigadores schema', migrationErr);
    }
  } catch (err) {
    console.error('Error creating tables', err);
  }
})();

// register route
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [
      email,
      hashed,
    ]);
    res.status(201).json({ id: result.insertId, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    // log full details to help debugging
    console.error('Registration error:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ id: user.id, email: user.email, role: user.role || 'user' });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// list investigadores (nombre, cedula, facultad, programa)
app.get('/api/investigadores', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre_completo, cedula, facultad, programa_academico FROM investigadores'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching investigadores:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// get single investigador by id
app.get('/investigadores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id, nombre_completo, cedula, link_cvlac, facultad, programa_academico FROM investigadores WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// add investigador route
app.post('/investigadores', async (req, res) => {
  const { nombre_completo, cedula, link_cvlac, facultad, programa_academico } = req.body;
  console.log('Received data:', { nombre_completo, cedula, link_cvlac, facultad, programa_academico });
  
  if (!nombre_completo) {
    return res.status(400).json({ message: 'nombre_completo is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO investigadores (nombre_completo, cedula, link_cvlac, facultad, programa_academico) VALUES (?, ?, ?, ?, ?)',
      [nombre_completo, cedula || null, link_cvlac || null, facultad || null, programa_academico || null]
    );
    res.status(201).json({ id: result.insertId, nombre_completo, cedula, link_cvlac, facultad, programa_academico });
  } catch (err) {
    console.error('Error inserting investigador:', err.message, err.code);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cédula already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// update investigador by id
app.put('/investigadores/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, cedula, link_cvlac, facultad, programa_academico } = req.body;
  try {
    const fields = [];
    const values = [];
    if (nombre_completo !== undefined) { fields.push('nombre_completo = ?'); values.push(nombre_completo); }
    if (cedula !== undefined) { fields.push('cedula = ?'); values.push(cedula); }
    if (link_cvlac !== undefined) { fields.push('link_cvlac = ?'); values.push(link_cvlac); }
    if (facultad !== undefined) { fields.push('facultad = ?'); values.push(facultad); }
    if (programa_academico !== undefined) { fields.push('programa_academico = ?'); values.push(programa_academico); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const sql = `UPDATE investigadores SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });

    const [rows] = await pool.query('SELECT id, nombre_completo, cedula, link_cvlac, facultad, programa_academico FROM investigadores WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// delete investigador by id
app.delete('/investigadores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM investigadores WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// get resultados with optional filters – selects from the view
app.get('/api/resultados', async (req, res) => {
  const { facultad, programa, anio, investigador, tipo, categoria, tipologia, titulo_proyecto } = req.query;
  /*
    Use tabla_Normalizada_final (view with clean, deduplicated data from coincidences)
    This view auto-updates when scraping runs
  */
  let sql = `SELECT
      facultad,
      programa_academico AS programa,
      categoria,
      nombre,
      tipo_proyecto,
      nodo_padre_resultados AS nodo_padre,
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
      revista
    FROM scraping.tabla_Normalizada_final`;
  const conditions = [];
  const params = [];
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (programa) {
    conditions.push('programa_academico = ?');
    params.push(programa);
  }
  if (anio) {
    conditions.push('anio = ?');
    params.push(anio);
  }
  if (investigador) {
    conditions.push('nombre LIKE ?');
    params.push(`%${investigador}%`);
  }
  if (tipo) {
    conditions.push('tipo_proyecto = ?');
    params.push(tipo);
  }
  if (categoria) {
    conditions.push('categoria = ?');
    params.push(categoria);
  }
  if (tipologia) {
    conditions.push('nodo_padre_resultados = ?');
    params.push(tipologia);
  }
  if (titulo_proyecto) {
    conditions.push('titulo_proyecto LIKE ?');
    params.push(`%${titulo_proyecto}%`);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  try {
    console.log('[API] /api/resultados SQL built', { sql, params });
    const [rows] = await pool.query(sql, params);
    console.log('[API] /api/resultados success', { rowCount: rows.length });
    res.json(rows);
  } catch (err) {
    console.error('[API] /api/resultados error', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      sql,
      params,
      stack: err.stack,
    });
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// get tabla_normalizada_final with optional filters for CSV download
app.get('/api/tabla-normalizada-final', async (req, res) => {
  const { facultad, programa } = req.query;
  let sql = `SELECT
      facultad,
      programa_academico AS programa,
      categoria,
      nombre,
      tipo_proyecto,
      nodo_padre_resultados AS nodo_padre,
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
      revista
    FROM scraping.tabla_Normalizada_final`;
  const conditions = [];
  const params = [];
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (programa) {
    conditions.push('programa_academico = ?');
    params.push(programa);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tabla_normalizada_final:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// provide aggregated counts by tipologia using nodos, with optional filters
app.get('/api/tipologia-cantidades', async (req, res) => {
  const { facultad, programa, anio, investigador, tipo, categoria, cedula, sexo, grado, tipologia, titulo_proyecto } = req.query;
  /* Use tabla_Normalizada_final for aggregated counts by tipologia */
  let sql = `
    SELECT r.nodo_padre AS tipologia, COUNT(*) AS cantidad
    FROM (
      SELECT
        facultad,
        programa_academico AS programa,
        categoria,
        nombre,
        tipo_proyecto,
        nodo_padre_resultados AS nodo_padre,
        titulo_proyecto,
        anio
      FROM scraping.tabla_Normalizada_final
    ) r
  `;
  const conditions = [];
  const params = [];
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (programa) {
    conditions.push('programa = ?');
    params.push(programa);
  }
  if (anio) {
    conditions.push('anio = ?');
    params.push(anio);
  }
  if (investigador) {
    conditions.push('nombre LIKE ?');
    params.push(`%${investigador}%`);
  }
  if (tipo) {
    conditions.push('tipo_proyecto = ?');
    params.push(tipo);
  }
  if (categoria) {
    conditions.push('categoria = ?');
    params.push(categoria);
  }
  if (tipologia) {
    conditions.push('nodo_padre = ?');
    params.push(tipologia);
  }
  if (titulo_proyecto) {
    conditions.push('titulo_proyecto LIKE ?');
    params.push(`%${titulo_proyecto}%`);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += `
    GROUP BY r.nodo_padre
    ORDER BY cantidad DESC
    LIMIT 5
  `;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tipologia counts:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// provide aggregated counts by nodo hijo (tipo de producto) optionally filtered by tipologia or other query params
app.get('/api/nodo-hijo-cantidades', async (req, res) => {
  const { facultad, programa, anio, investigador, tipologia, tipo, categoria, cedula, sexo, grado, titulo_proyecto } = req.query;
  /* Use tabla_Normalizada_final for aggregated counts by nodo hijo */
  let sql = `
    SELECT r.tipo_proyecto AS nodo, COUNT(*) AS cantidad
    FROM (
      SELECT
        facultad,
        programa_academico AS programa,
        categoria,
        nombre,
        tipo_proyecto,
        nodo_padre_resultados AS nodo_padre,
        titulo_proyecto,
        anio
      FROM scraping.tabla_Normalizada_final
    ) r
  `;
  const conditions = [];
  const params = [];
  if (facultad) {
    conditions.push('facultad = ?');
    params.push(facultad);
  }
  if (programa) {
    conditions.push('programa = ?');
    params.push(programa);
  }
  if (anio) {
    conditions.push('anio = ?');
    params.push(anio);
  }
  if (investigador) {
    conditions.push('nombre LIKE ?');
    params.push(`%${investigador}%`);
  }
  if (tipologia) {
    conditions.push('r.nodo_padre = ?');
    params.push(tipologia);
  }  
  if (tipo) {
    conditions.push('tipo_proyecto = ?');
    params.push(tipo);
  }
  if (categoria) {
    conditions.push('categoria = ?');
    params.push(categoria);
  }
  if (titulo_proyecto) {
    conditions.push('titulo_proyecto LIKE ?');
    params.push(`%${titulo_proyecto}%`);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += `
    GROUP BY r.tipo_proyecto
    ORDER BY cantidad DESC
  `;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching nodo hijo counts:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
// scraping endpoints (clean architecture)
app.post('/api/scraping/ejecutar', scrapingController.ejecutar);
app.post('/api/scraping/ejecutar-grouplab', scrapingController.ejecutarGroupLab);

// global error handler (catches unhandled errors passed to next())
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({ message: 'internal server error', error: err.message || 'unknown' });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
