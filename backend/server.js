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
        id_investigador INT AUTO_INCREMENT PRIMARY KEY,
        nombre_completo VARCHAR(255) NOT NULL,
        cedula VARCHAR(50) UNIQUE,
        link_cvlac VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(20) DEFAULT 'pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        correo VARCHAR(255),
        google_scholar VARCHAR(255),
        orcid VARCHAR(255)
      ) ENGINE=InnoDB;
    `;
    await pool.query(createInvestigadoresSql);
    console.log('investigadores table ensured');

    // Ensure PK column name is available before creating views that reference it.
    try {
      const [invCols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const invNames = invCols.map(c => c.Field);
      if (invNames.includes('id') && !invNames.includes('id_investigador')) {
        await pool.query('ALTER TABLE investigadores CHANGE id id_investigador INT AUTO_INCREMENT');
        console.log('renamed investigadores.id to id_investigador');
      }
    } catch (err) {
      console.error('Error ensuring id_investigador before view creation:', err.message);
    }

    // normalize catalog tables for facultad/programa and m:n relation
    const createFacultadSql = `
      CREATE TABLE IF NOT EXISTS facultad (
        id_facultad INT AUTO_INCREMENT PRIMARY KEY,
        nombre_facultad VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    const createProgramaSql = `
      CREATE TABLE IF NOT EXISTS programa (
        id_programa INT AUTO_INCREMENT PRIMARY KEY,
        nombre_programa VARCHAR(255) NOT NULL,
        id_facultad INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_programa_facultad (nombre_programa, id_facultad),
        CONSTRAINT fk_programa_facultad FOREIGN KEY (id_facultad) REFERENCES facultad(id_facultad)
      ) ENGINE=InnoDB;
    `;
    const createInvestigadorProgramaFacultadSql = `
      CREATE TABLE IF NOT EXISTS investigador_programa_facultad (
        id_relacion INT AUTO_INCREMENT PRIMARY KEY,
        id_investigador INT NOT NULL,
        id_programa INT NOT NULL,
        id_facultad INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_inv_prog_fac (id_investigador, id_programa, id_facultad),
        CONSTRAINT fk_ipf_investigador FOREIGN KEY (id_investigador) REFERENCES investigadores(id_investigador) ON DELETE CASCADE,
        CONSTRAINT fk_ipf_programa FOREIGN KEY (id_programa) REFERENCES programa(id_programa) ON DELETE CASCADE,
        CONSTRAINT fk_ipf_facultad FOREIGN KEY (id_facultad) REFERENCES facultad(id_facultad) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(createFacultadSql);
    await pool.query(createProgramaSql);
    await pool.query(createInvestigadorProgramaFacultadSql);

    // Remove id_investigador column from programa if it exists (convert to catalog)
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM programa");
      const colNames = cols.map(c => c.Field);
      
      if (colNames.includes('id_investigador')) {
        // Drop FK constraint first
        try {
          await pool.query(`ALTER TABLE programa DROP FOREIGN KEY fk_programa_investigador`);
        } catch (err) {
          // FK might not exist
        }
        
        // Drop old unique constraint
        try {
          await pool.query(`ALTER TABLE programa DROP INDEX uq_programa_facultad_inv`);
        } catch (err) {
          // Constraint might not exist
        }
        
        // Remove column
        await pool.query(`ALTER TABLE programa DROP COLUMN id_investigador`);
        console.log('Removed id_investigador column from programa (converted to catalog)');
        
        // Add back simple unique constraint
        try {
          await pool.query(`ALTER TABLE programa ADD UNIQUE KEY uq_programa_facultad (nombre_programa, id_facultad)`);
        } catch (err) {
          // Constraint might already exist
        }
      }
    } catch (err) {
      console.error('Error converting programa to catalog:', err.message);
    }

    // seed requested base catalog data with coordinators
    await pool.query(
      `INSERT IGNORE INTO facultad (nombre_facultad) VALUES (?)`,
      ['Facultad de Ingeniería']
    );
    
    // Get the faculty ID for reference
    const [[{ id_facultad }]] = await pool.query(
      `SELECT id_facultad FROM facultad WHERE nombre_facultad = 'Facultad de Ingeniería'`
    );

    // Get all investigators
    const [allInvestigators] = await pool.query(`SELECT id_investigador FROM investigadores ORDER BY id_investigador`);
    console.log(`Found ${allInvestigators.length} investigators for program assignment`);

    // Clean up old entries
    
    // Reset AUTO_INCREMENT to start from 1
    await pool.query(`ALTER TABLE programa AUTO_INCREMENT = 1`);
    
    // Define the 3 programs (catalog)
    const programNames = [
      'Ingeniería de Sistemas',
      'Ingeniería Industrial',
      'Especialización en Inteligencia de Negocios y Big Data'
    ];

    // Insert 3 programs as catalog
    for (const programName of programNames) {
      await pool.query(
        `INSERT IGNORE INTO programa (nombre_programa, id_facultad) VALUES (?, ?)`,
        [programName, id_facultad]
      );
    }
    console.log(`Created ${programNames.length} programs in catalog`);

    // Get program IDs
    const [programas] = await pool.query(`SELECT id_programa, nombre_programa FROM programa ORDER BY id_programa`);
    
    // NOTE: Do NOT auto-populate investigador_programa_facultad here
    // Relationships will be created when users add/edit investigators via the API
    // This prevents creating unwanted cross-join of all investigators with all programs
    
    console.log(`Created ${programas.length} programs. Relationships will be added via API when users assign programs to investigators.`);

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

    // Add correo, google_scholar and orcid columns to investigadores if they don't exist
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const colNames = cols.map(c => c.Field);
      const newColumns = [];
      
      if (!colNames.includes('correo')) {
        newColumns.push("ADD COLUMN correo VARCHAR(255)");
      }
      if (!colNames.includes('google_scholar')) {
        newColumns.push("ADD COLUMN google_scholar VARCHAR(255)");
      }
      if (!colNames.includes('orcid')) {
        newColumns.push("ADD COLUMN orcid VARCHAR(255)");
      }
      
      if (newColumns.length > 0) {
        const alterSql = `ALTER TABLE investigadores ${newColumns.join(', ')}`;
        await pool.query(alterSql);
        console.log('Added new columns to investigadores:', newColumns.join(', '));
      }
    } catch (err) {
      console.error('Error checking/adding new columns to investigadores:', err.message);
    }

    // create or refresh the view the frontend will use for exploratory data
    const createViewSql = `
      CREATE OR REPLACE VIEW vista_productos_final AS
      WITH resultados_unicos AS (
        SELECT
          r.*,
          ROW_NUMBER() OVER (
            PARTITION BY
              LOWER(TRIM(REGEXP_REPLACE(COALESCE(r.titulo_proyecto, ''), '[[:space:]]+', ' '))),
              LOWER(TRIM(COALESCE(r.tipo_proyecto, ''))),
              COALESCE(CAST(r.anio AS CHAR), ''),
              LOWER(TRIM(COALESCE(r.nodo_padre, '')))
            ORDER BY r.id
          ) AS rn
        FROM resultados r
      )
      SELECT ru.id, ru.categoria, ru.nombre, ru.sexo, ru.grado,
             ru.tipo_proyecto, ru.titulo_proyecto, ru.anio, ru.id_investigador,
             ru.nodo_padre, IFNULL(rel.facultad, '') AS facultad, IFNULL(rel.programa, '') AS programa,
             i.nombre_completo AS investigador, i.link_cvlac, i.cedula,
             i.correo, i.google_scholar, i.orcid
      FROM resultados_unicos ru
      LEFT JOIN investigadores i ON ru.id_investigador = i.id_investigador
      LEFT JOIN (
        SELECT
          ipf.id_investigador,
          GROUP_CONCAT(DISTINCT f.nombre_facultad ORDER BY f.nombre_facultad SEPARATOR ' / ') AS facultad,
          GROUP_CONCAT(DISTINCT p.nombre_programa ORDER BY p.nombre_programa SEPARATOR ' / ') AS programa
        FROM investigador_programa_facultad ipf
        LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
        LEFT JOIN programa p ON p.id_programa = ipf.id_programa
        GROUP BY ipf.id_investigador
      ) rel ON rel.id_investigador = ru.id_investigador
      WHERE ru.rn = 1;
    `;
    await pool.query(createViewSql);
    console.log('database view vista_productos_final ensured');

    /*
     * migration: if the table existed with old column names, rename them.
     */
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const names = cols.map(c => c.Field);

      if (names.includes('id') && !names.includes('id_investigador')) {
        await pool.query('ALTER TABLE investigadores CHANGE id id_investigador INT AUTO_INCREMENT');
      }

      const [afterIdRenameCols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const refreshedNames = afterIdRenameCols.map(c => c.Field);

      // map legacy column names before dropping old schema columns
      if (refreshedNames.includes('programa') && !refreshedNames.includes('programa_academico')) {
        await pool.query('ALTER TABLE investigadores CHANGE programa programa_academico VARCHAR(255)');
      }
      if (refreshedNames.includes('nombre') && !refreshedNames.includes('nombre_completo')) {
        await pool.query('ALTER TABLE investigadores CHANGE nombre nombre_completo VARCHAR(255)');
      }
      if (refreshedNames.includes('link') && !refreshedNames.includes('link_cvlac')) {
        await pool.query('ALTER TABLE investigadores CHANGE link link_cvlac VARCHAR(255)');
      }

      // migrate existing facultad/programa values to normalized relationship tables
      const [legacyCols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const legacyNames = legacyCols.map(c => c.Field);
      const hasLegacyFac = legacyNames.includes('facultad');
      const hasLegacyProg = legacyNames.includes('programa_academico');

      if (hasLegacyFac || hasLegacyProg) {
        if (hasLegacyFac) {
          await pool.query(`
            INSERT IGNORE INTO facultad (nombre_facultad)
            SELECT DISTINCT TRIM(facultad)
            FROM investigadores
            WHERE facultad IS NOT NULL AND TRIM(facultad) <> ''
          `);
        }

        await pool.query(`
          INSERT IGNORE INTO programa (nombre_programa, id_facultad)
          SELECT DISTINCT
            TRIM(i.programa_academico) AS nombre_programa,
            f.id_facultad
          FROM investigadores i
          JOIN facultad f
            ON f.nombre_facultad = COALESCE(NULLIF(TRIM(i.facultad), ''), 'Facultad de Ingeniería')
          WHERE i.programa_academico IS NOT NULL AND TRIM(i.programa_academico) <> ''
        `);

        await pool.query(`
          INSERT IGNORE INTO investigador_programa_facultad (id_investigador, id_programa, id_facultad)
          SELECT DISTINCT
            i.id_investigador,
            p.id_programa,
            f.id_facultad
          FROM investigadores i
          JOIN facultad f
            ON f.nombre_facultad = COALESCE(NULLIF(TRIM(i.facultad), ''), 'Facultad de Ingeniería')
          JOIN programa p
            ON p.nombre_programa = TRIM(i.programa_academico)
           AND p.id_facultad = f.id_facultad
          WHERE i.programa_academico IS NOT NULL AND TRIM(i.programa_academico) <> ''
        `);
      }

      // remove old columns requested by user
      const [cleanupCols] = await pool.query("SHOW COLUMNS FROM investigadores");
      const cleanupNames = cleanupCols.map(c => c.Field);
      const cleanupAlterations = [];
      if (cleanupNames.includes('facultad')) cleanupAlterations.push('DROP COLUMN facultad');
      if (cleanupNames.includes('programa_academico')) cleanupAlterations.push('DROP COLUMN programa_academico');
      if (cleanupNames.includes('nombre')) cleanupAlterations.push('DROP COLUMN nombre');
      if (cleanupNames.includes('link')) cleanupAlterations.push('DROP COLUMN link');
      if (cleanupAlterations.length > 0) {
        await pool.query('ALTER TABLE investigadores ' + cleanupAlterations.join(', '));
      }
    } catch (migrationErr) {
      console.error('Error migrating investigadores schema', migrationErr);
    }

    // Create or replace the unified view for investigadores with all related data
    const createInvestigadoresViewSql = `
      CREATE OR REPLACE VIEW vista_investigadores_completa AS
      SELECT 
        ipf.id_relacion,
        ipf.id_investigador,
        i.nombre_completo AS investigador,
        i.cedula,
        i.link_cvlac,
        i.correo,
        i.google_scholar,
        i.orcid,
        ipf.id_programa,
        p.nombre_programa AS programa,
        ipf.id_facultad,
        f.nombre_facultad AS facultad,
        ipf.created_at
      FROM investigador_programa_facultad ipf
      LEFT JOIN investigadores i ON i.id_investigador = ipf.id_investigador
      LEFT JOIN programa p ON p.id_programa = ipf.id_programa
      LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
    `;
    await pool.query(createInvestigadoresViewSql);
    console.log('database view vista_investigadores_completa created');

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
const loginHandler = async (req, res) => {
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
};

app.post('/api/login', loginHandler);
app.post('/login', loginHandler);

// list programas catalogo
app.get('/api/programas', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT nombre_programa
       FROM programa
       ORDER BY id_programa`
    );
    res.json(rows.map((row) => row.nombre_programa).filter(Boolean));
  } catch (err) {
    console.error('Error fetching programas:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// list investigadores (nombre, cedula, facultad, programa) - grouped by investigador
app.get('/api/investigadores', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        i.id_investigador,
        i.nombre_completo,
        i.cedula,
        i.link_cvlac,
        i.correo,
        i.google_scholar,
        i.orcid,
        GROUP_CONCAT(DISTINCT p.nombre_programa ORDER BY p.nombre_programa SEPARATOR ', ') AS programa_academico,
        GROUP_CONCAT(DISTINCT f.nombre_facultad ORDER BY f.nombre_facultad SEPARATOR ', ') AS facultad
      FROM investigadores i
      LEFT JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
      LEFT JOIN programa p ON p.id_programa = ipf.id_programa
      LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
      GROUP BY i.id_investigador, i.nombre_completo, i.cedula, i.link_cvlac, i.correo, i.google_scholar, i.orcid
      ORDER BY i.nombre_completo`
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
    const [rows] = await pool.query(
      `SELECT
        i.id_investigador,
        i.nombre_completo AS investigador,
        p.nombre_programa AS programa,
        f.nombre_facultad AS facultad,
        i.cedula,
        i.link_cvlac,
        i.correo,
        i.google_scholar,
        i.orcid
      FROM investigadores i
      LEFT JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
      LEFT JOIN programa p ON p.id_programa = ipf.id_programa
      LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
      WHERE i.id_investigador = ?
      ORDER BY p.nombre_programa`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows);
  } catch (err) {
    console.error('Error fetching investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// add investigador route
app.post('/investigadores', async (req, res) => {
  const { nombre_completo, cedula, link_cvlac, facultad, programa_academico, programas, correo, google_scholar, orcid } = req.body;
  console.log('Received data:', { nombre_completo, cedula, link_cvlac, facultad, programa_academico, correo, google_scholar, orcid });
  
  if (!nombre_completo) {
    return res.status(400).json({ message: 'nombre_completo is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO investigadores (nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre_completo, cedula || null, link_cvlac || null, correo || null, google_scholar || null, orcid || null]
    );

    const facultadNombre = (facultad && String(facultad).trim()) || 'Facultad de Ingeniería';
    await pool.query('INSERT IGNORE INTO facultad (nombre_facultad) VALUES (?)', [facultadNombre]);
    const [facRows] = await pool.query('SELECT id_facultad FROM facultad WHERE nombre_facultad = ?', [facultadNombre]);
    const idFacultad = facRows[0]?.id_facultad;

    const programasList = Array.isArray(programas)
      ? programas.filter(Boolean)
      : [programa_academico].filter(Boolean);

    for (const nombreProgramaRaw of programasList) {
      const nombrePrograma = String(nombreProgramaRaw).trim();
      if (!nombrePrograma) continue;
      await pool.query(
        'INSERT IGNORE INTO programa (nombre_programa, id_facultad) VALUES (?, ?)',
        [nombrePrograma, idFacultad]
      );
      const [progRows] = await pool.query(
        'SELECT id_programa FROM programa WHERE nombre_programa = ? AND id_facultad = ?',
        [nombrePrograma, idFacultad]
      );
      const idPrograma = progRows[0]?.id_programa;
      if (idPrograma) {
        await pool.query(
          'INSERT IGNORE INTO investigador_programa_facultad (id_investigador, id_programa, id_facultad) VALUES (?, ?, ?)',
          [result.insertId, idPrograma, idFacultad]
        );
      }
    }

    res.status(201).json({ id_investigador: result.insertId, nombre_completo, cedula, link_cvlac, facultad: facultadNombre, programa_academico, correo, google_scholar, orcid });
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
  const { nombre_completo, cedula, link_cvlac, facultad, programa_academico, programas, correo, google_scholar, orcid } = req.body;
  try {
    const fields = [];
    const values = [];
    if (nombre_completo !== undefined) { fields.push('nombre_completo = ?'); values.push(nombre_completo); }
    if (cedula !== undefined) { fields.push('cedula = ?'); values.push(cedula); }
    if (link_cvlac !== undefined) { fields.push('link_cvlac = ?'); values.push(link_cvlac); }
    if (correo !== undefined) { fields.push('correo = ?'); values.push(correo); }
    if (google_scholar !== undefined) { fields.push('google_scholar = ?'); values.push(google_scholar); }
    if (orcid !== undefined) { fields.push('orcid = ?'); values.push(orcid); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const sql = `UPDATE investigadores SET ${fields.join(', ')} WHERE id_investigador = ?`;
    const [result] = await pool.query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });

    if (facultad !== undefined || programa_academico !== undefined || programas !== undefined) {
      const facultadNombre = (facultad && String(facultad).trim()) || 'Facultad de Ingeniería';
      await pool.query('INSERT IGNORE INTO facultad (nombre_facultad) VALUES (?)', [facultadNombre]);
      const [facRows] = await pool.query('SELECT id_facultad FROM facultad WHERE nombre_facultad = ?', [facultadNombre]);
      const idFacultad = facRows[0]?.id_facultad;

        // Solo relacionar programas existentes, no agregar nuevos
        await pool.query('DELETE FROM investigador_programa_facultad WHERE id_investigador = ?', [id]);

      const programasList = Array.isArray(programas)
        ? programas.filter(Boolean)
        : [programa_academico].filter(Boolean);

        for (const nombreProgramaRaw of programasList) {
          const nombrePrograma = String(nombreProgramaRaw).trim();
          if (!nombrePrograma) continue;
          // Buscar programa existente
          const [progRows] = await pool.query(
            'SELECT id_programa FROM programa WHERE nombre_programa = ? AND id_facultad = ?',
            [nombrePrograma, idFacultad]
          );
          const idPrograma = progRows[0]?.id_programa;
          if (idPrograma) {
            await pool.query(
              'INSERT IGNORE INTO investigador_programa_facultad (id_investigador, id_programa, id_facultad) VALUES (?, ?, ?)',
              [id, idPrograma, idFacultad]
            );
          }
          // Si no existe, ignorar
        }
    }

    const [rows] = await pool.query(
      `SELECT
        i.id_investigador,
        i.nombre_completo,
        i.cedula,
        i.link_cvlac,
        i.correo,
        i.google_scholar,
        i.orcid,
        GROUP_CONCAT(DISTINCT f.nombre_facultad ORDER BY f.nombre_facultad SEPARATOR ' / ') AS facultad,
        GROUP_CONCAT(DISTINCT p.nombre_programa ORDER BY p.nombre_programa SEPARATOR ' / ') AS programa_academico
      FROM investigadores i
      LEFT JOIN investigador_programa_facultad ipf ON ipf.id_investigador = i.id_investigador
      LEFT JOIN facultad f ON f.id_facultad = ipf.id_facultad
      LEFT JOIN programa p ON p.id_programa = ipf.id_programa
      WHERE i.id_investigador = ?
      GROUP BY i.id_investigador, i.nombre_completo, i.cedula, i.link_cvlac, i.correo, i.google_scholar, i.orcid`,
      [id]
    );
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
    const [result] = await pool.query('DELETE FROM investigadores WHERE id_investigador = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// get resultados with optional filters – selects from the view
app.get('/api/resultados', async (req, res) => {
  const { facultad, programa, anio, investigador, tipo, categoria, tipologia, titulo_proyecto, source, normalized_mode } = req.query;
  const sourceValue = String(source || '').toLowerCase();
  const useNormalizedSource = sourceValue === 'normalizada' || sourceValue === 'normalizada_merge';
  const normalizedMode = String(normalized_mode || '').toLowerCase();
  const useMergedNormalized = useNormalizedSource && (
    normalizedMode === 'merge' ||
    normalizedMode === 'completo' ||
    normalizedMode === 'full' ||
    sourceValue === 'normalizada_merge'
  );
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
  const normalizedSql = `SELECT
      r.id,
      r.id_investigador,
      r.categoria,
      r.nombre,
      r.sexo,
      r.grado,
      r.tipo_proyecto,
      r.nodo_padre,
      r.titulo_proyecto,
      r.anio,
      r.facultad,
      r.programa,
      r.nombre_completo,
      r.link_cvlac,
      r.cedula,
      r.correo,
      r.google_scholar,
      r.orcid,
      r.autor_1_grouplab,
      r.autor_2_grouplab,
      r.autor_3_grouplab,
      r.autor_4_grouplab,
      r.autor_5_grouplab,
      r.tipo_grouplab,
      r.nodo_padre_grouplab,
      r.titulo_grouplab,
      r.issn,
      r.isbn,
      r.revista
    FROM (
      SELECT
        tn.id,
        tn.id_investigador,
        tn.categoria,
        tn.nombre,
        rs.sexo,
        rs.grado,
        tn.tipo_proyecto,
        tn.nodo_padre_grouplab AS nodo_padre,
        tn.titulo_proyecto,
        tn.anio,
        tn.facultad,
        tn.programa_academico AS programa,
        i.nombre_completo,
        i.link_cvlac,
        i.cedula,
        i.correo,
        i.google_scholar,
        i.orcid,
        tn.autor_1_grouplab,
        tn.autor_2_grouplab,
        tn.autor_3_grouplab,
        tn.autor_4_grouplab,
        tn.autor_5_grouplab,
        tn.tipo_grouplab,
        tn.nodo_padre_grouplab,
        tn.titulo_grouplab,
        tn.issn,
        tn.isbn,
        tn.revista
      FROM scraping.tabla_normalizada_final tn
      LEFT JOIN resultados rs ON tn.id = rs.id
      LEFT JOIN investigadores i ON tn.id_investigador = i.id_investigador
    ) r${whereClause}`;
  const fallbackSql = `SELECT
      r.id,
      r.id_investigador,
      r.categoria,
      r.nombre,
      r.sexo,
      r.grado,
      r.tipo_proyecto,
      r.nodo_padre,
      r.titulo_proyecto,
      r.anio,
      r.facultad,
      r.programa,
      r.investigador AS nombre_completo,
      r.link_cvlac,
      r.cedula,
      r.correo,
      r.google_scholar,
      r.orcid,
      NULL AS autor_1_grouplab,
      NULL AS autor_2_grouplab,
      NULL AS autor_3_grouplab,
      NULL AS autor_4_grouplab,
      NULL AS autor_5_grouplab,
      NULL AS tipo_grouplab,
      NULL AS nodo_padre_grouplab,
      NULL AS nombre_grupo_grouplab,
      NULL AS sigla_grupo_grouplab,
      NULL AS titulo_grouplab,
      NULL AS issn,
      NULL AS isbn,
      NULL AS revista
    FROM vista_productos_final r${whereClause}`;
  // Deduplicated fallback that emulates normalized behavior on current schema.
  const dedupFallbackSql = `WITH ranked AS (
      SELECT
        v.id,
        v.id_investigador,
        v.categoria,
        v.nombre,
        v.sexo,
        v.grado,
        v.tipo_proyecto,
        v.nodo_padre,
        v.titulo_proyecto,
        v.anio,
        v.facultad,
        v.programa,
        v.investigador AS nombre_completo,
        v.link_cvlac,
        v.cedula,
        v.correo,
        v.google_scholar,
        v.orcid,
        ROW_NUMBER() OVER (
          PARTITION BY
            LOWER(TRIM(REGEXP_REPLACE(COALESCE(v.titulo_proyecto, ''), '[[:space:]]+', ' '))),
            LOWER(TRIM(COALESCE(v.tipo_proyecto, ''))),
            COALESCE(CAST(v.anio AS CHAR), ''),
            LOWER(TRIM(COALESCE(v.nodo_padre, '')))
          ORDER BY v.id
        ) AS rn
      FROM vista_productos_final v
    )
    SELECT
      r.id,
      r.id_investigador,
      r.categoria,
      r.nombre,
      r.sexo,
      r.grado,
      r.tipo_proyecto,
      r.nodo_padre,
      r.titulo_proyecto,
      r.anio,
      r.facultad,
      r.programa,
      r.nombre_completo,
      r.link_cvlac,
      r.cedula,
      r.correo,
      r.google_scholar,
      r.orcid,
      NULL AS autor_1_grouplab,
      NULL AS autor_2_grouplab,
      NULL AS autor_3_grouplab,
      NULL AS autor_4_grouplab,
      NULL AS autor_5_grouplab,
      NULL AS tipo_grouplab,
      NULL AS nodo_padre_grouplab,
      NULL AS nombre_grupo_grouplab,
      NULL AS sigla_grupo_grouplab,
      NULL AS titulo_grouplab,
      NULL AS issn,
      NULL AS isbn,
      NULL AS revista
    FROM ranked r
    WHERE r.rn = 1${conditions.length ? (' AND ' + conditions.join(' AND ')) : ''}`;
  let executedSql = fallbackSql;
  try {
    if (useNormalizedSource) {
      try {
        const [normalizedRows] = await pool.query(normalizedSql, params);
        if (!useMergedNormalized) {
          console.log('[API] /api/resultados success (normalized strict)', {
            rowCount: normalizedRows.length,
          });
          return res.json(normalizedRows);
        }

        const [dedupRows] = await pool.query(dedupFallbackSql, params);

        // Optional mode: merge both sources to avoid losing rows absent in tabla_Normalizada_final.
        const mergedMap = new Map();
        const buildKey = (row) => {
          const titulo = String(row.titulo_proyecto || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const tipoProyecto = String(row.tipo_proyecto || '').toLowerCase().trim();
          const anioValue = String(row.anio || '').trim();
          const nodoPadre = String(row.nodo_padre || '').toLowerCase().trim();
          return `${titulo}||${tipoProyecto}||${anioValue}||${nodoPadre}`;
        };

        for (const row of dedupRows) {
          mergedMap.set(buildKey(row), row);
        }
        // Normalized rows win when duplicate key exists.
        for (const row of normalizedRows) {
          mergedMap.set(buildKey(row), row);
        }

        const mergedRows = Array.from(mergedMap.values());
        console.log('[API] /api/resultados success (normalized merged)', {
          normalized: normalizedRows.length,
          dedupFallback: dedupRows.length,
          merged: mergedRows.length,
        });
        return res.json(mergedRows);
      } catch (normalizedErr) {
        console.warn('[API] /api/resultados normalized source failed, using fallback view', {
          message: normalizedErr.message,
        });
        const [dedupRows] = await pool.query(dedupFallbackSql, params);
        console.log('[API] /api/resultados success (dedup fallback)', { rowCount: dedupRows.length });
        return res.json(dedupRows);
      }
    }

    console.log('[API] /api/resultados SQL built (fallback)', { sql: executedSql, params });
    const [rows] = await pool.query(executedSql, params);
    console.log('[API] /api/resultados success', { rowCount: rows.length });
    res.json(rows);
  } catch (err) {
    console.error('[API] /api/resultados error', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      sql: executedSql,
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
    console.warn('tabla_normalizada_final unavailable, using vista_productos_final fallback:', err.message);
    let fallbackSql = `SELECT
        r.facultad,
        r.programa,
        r.categoria,
        r.nombre,
        r.tipo_proyecto,
        r.nodo_padre,
        r.titulo_proyecto,
        r.anio,
        NULL AS tipo_grouplab,
        NULL AS nodo_padre_grouplab,
        NULL AS autor_1_grouplab,
        NULL AS autor_2_grouplab,
        NULL AS autor_3_grouplab,
        NULL AS autor_4_grouplab,
        NULL AS autor_5_grouplab,
        NULL AS issn,
        NULL AS isbn,
        NULL AS revista,
        NULL AS nombre_grupo_grouplab,
        NULL AS sigla_grupo_grouplab
      FROM vista_productos_final r`;
    const fallbackConditions = [];
    const fallbackParams = [];
    if (facultad) {
      fallbackConditions.push('r.facultad = ?');
      fallbackParams.push(facultad);
    }
    if (programa) {
      fallbackConditions.push('r.programa = ?');
      fallbackParams.push(programa);
    }
    if (fallbackConditions.length) {
      fallbackSql += ' WHERE ' + fallbackConditions.join(' AND ');
    }
    const [rows] = await pool.query(fallbackSql, fallbackParams);
    res.json(rows);
  }
});

// provide aggregated counts by tipologia using nodos, with optional filters
app.get('/api/tipologia-cantidades', async (req, res) => {
  const { facultad, programa, anio, investigador, tipo, categoria, cedula, sexo, grado, tipologia, titulo_proyecto } = req.query;
  // Use vista_productos_final to stay compatible with the normalized M:N schema.
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
  // Use vista_productos_final to stay compatible with the normalized M:N schema.
  let sql = `
    SELECT r.tipo_proyecto AS nodo, COUNT(*) AS cantidad
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
  if (tipologia) {
    conditions.push('LOWER(TRIM(r.nodo_padre)) = LOWER(TRIM(?))');
    params.push(tipologia);
  }
  if (tipo) {
    conditions.push('r.tipo_proyecto = ?');
    params.push(tipo);
  }
  if (categoria) {
    conditions.push('r.categoria = ?');
    params.push(categoria);
  }
  if (titulo_proyecto) {
    conditions.push('r.titulo_proyecto LIKE ?');
    params.push(`%${titulo_proyecto}%`);
  }
  conditions.push('r.tipo_proyecto IS NOT NULL AND TRIM(r.tipo_proyecto) <> ""');
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
app.post('/api/scraping/ejecutar-completo', scrapingController.ejecutarCompleto);

// global error handler (catches unhandled errors passed to next())
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({ message: 'internal server error', error: err.message || 'unknown' });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
