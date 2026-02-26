const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const scrapingController = require('./controller/scrapingController');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// create users and investigadores tables if not exists
(async () => {
  try {
    const createUsersSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(createUsersSql);
    console.log('users table ensured');

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
app.post('/login', async (req, res) => {
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
    res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// list investigadores (nombre, cedula, facultad, programa)
app.get('/investigadores', async (req, res) => {
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
  const { facultad, programa, anio, investigador, tipo, categoria, cedula, sexo, grado, tipologia, titulo_proyecto } = req.query;
  let sql = 'SELECT * FROM vista_productos_final';
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
    // search in either column name used by the view: 'investigador' or 'nombre'
    conditions.push('(investigador LIKE ? OR nombre LIKE ?)');
    params.push(`%${investigador}%`);
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
  if (cedula) {
    conditions.push('cedula = ?');
    params.push(cedula);
  }
  if (sexo) {
    conditions.push('sexo = ?');
    params.push(sexo);
  }
  if (grado) {
    conditions.push('grado = ?');
    params.push(grado);
  }
  if (tipologia) {
    conditions.push('tipologia_productos = ?');
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
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching resultados:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// provide aggregated counts by tipologia using nodos, with optional filters
app.get('/api/tipologia-cantidades', async (req, res) => {
  const { facultad, programa, anio, investigador, tipo, categoria, cedula, sexo, grado, tipologia, titulo_proyecto } = req.query;
  let sql = `
    SELECT n.tipologia_productos AS tipologia, COUNT(*) AS cantidad
    FROM vista_productos_final r
    LEFT JOIN nodos n
      ON r.tipo_proyecto = n.nodo_hijo_scraping
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
    // search in either column name used by the view: 'investigador' or 'nombre'
    conditions.push('(investigador LIKE ? OR nombre LIKE ?)');
    params.push(`%${investigador}%`);
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
  if (cedula) {
    conditions.push('cedula = ?');
    params.push(cedula);
  }
  if (sexo) {
    conditions.push('sexo = ?');
    params.push(sexo);
  }
  if (grado) {
    conditions.push('grado = ?');
    params.push(grado);
  }
  if (tipologia) {
    conditions.push('tipologia_productos = ?');
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
    GROUP BY n.tipologia_productos
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
  let sql = `
    SELECT n.nodo_hijo_scraping AS nodo, COUNT(*) AS cantidad
    FROM vista_productos_final r
    LEFT JOIN nodos n
      ON r.tipo_proyecto = n.nodo_hijo_scraping
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
    // search in either column name used by the view: 'investigador' or 'nombre'
    conditions.push('(investigador LIKE ? OR nombre LIKE ?)');
    params.push(`%${investigador}%`);
    params.push(`%${investigador}%`);
  }
  if (tipologia) {
    conditions.push('n.tipologia_productos = ?');
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
  if (cedula) {
    conditions.push('cedula = ?');
    params.push(cedula);
  }
  if (sexo) {
    conditions.push('sexo = ?');
    params.push(sexo);
  }
  if (grado) {
    conditions.push('grado = ?');
    params.push(grado);
  }
  if (titulo_proyecto) {
    conditions.push('titulo_proyecto LIKE ?');
    params.push(`%${titulo_proyecto}%`);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += `
    GROUP BY n.nodo_hijo_scraping
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
// scraping endpoint (clean architecture)
app.post('/api/scraping/ejecutar', scrapingController.ejecutar);

// global error handler (catches unhandled errors passed to next())
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({ message: 'internal server error', error: err.message || 'unknown' });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
