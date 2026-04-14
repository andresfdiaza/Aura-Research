const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const scrapingController = require('./controller/scrapingController');
const { requireRole } = require('./middleware/roleAuth');
const { buildDataScope, getActorFromHeaders } = require('./service/accessScopeService');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());



//==========LOGIN========//
// login route separado en controller/service/repository
const { login } = require('./controller/authController');
app.post('/api/login', login);
app.post('/login', login);

// Endpoint para cambiar la contrasena del usuario autenticado
const { changeMyPasswordController } = require('./controller/passwordController');
app.post('/api/users/change-password', changeMyPasswordController);

// register route separado en controller/service/repository
const { register } = require('./controller/registerController');
app.post('/register', requireRole('admin', 'director'), register);
app.post('/api/register', requireRole('admin', 'director'), register);


// Endpoint para activar 2FA
const { activate2FAController } = require('./controller/twofaController');
app.post('/api/2fa/activate', activate2FAController);

// Endpoint para verificar código 2FA
const { verify2FAController } = require('./controller/verify2faController');
app.post('/api/2fa/verify', verify2FAController);

// Endpoint para reiniciar 2FA por email
app.post('/api/2fa/reset', requireRole('admin'), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email required' });
  try {
    const [result] = await pool.query('UPDATE users SET twofa_secret = NULL WHERE email = ?', [email]);
    if (result.affectedRows > 0) {
      res.json({ message: `2FA reiniciado para ${email}` });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});




// Endpoints para usuarios
const { listUsersController, updateUserController, deleteUserController } = require('./controller/userController');
app.get('/api/users', requireRole('admin', 'director'), listUsersController);
app.put('/api/users/:id', requireRole('admin', 'director'), updateUserController);
app.delete('/api/users/:id', requireRole('admin', 'director'), deleteUserController);

// Nuevo endpoint: lista completa de programas con facultad
app.get('/api/programas_full', async (_req, res) => {
  try {
    const actor = await getActorFromHeaders(_req.headers);
    const dataScope = buildDataScope(actor);
    const conditions = [];
    const params = [];

    if (Array.isArray(dataScope.id_facultades) && dataScope.id_facultades.length > 0) {
      conditions.push(`p.id_facultad IN (${dataScope.id_facultades.map(() => '?').join(',')})`);
      params.push(...dataScope.id_facultades);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT p.id_programa, p.nombre_programa, p.id_facultad, f.nombre_facultad
       FROM programa p
       LEFT JOIN facultad f ON f.id_facultad = p.id_facultad
       ${whereClause}
       ORDER BY p.id_programa`
      ,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching programas_full:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

app.get('/api/universidades', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_universidad, nombre_universidad, codigo
       FROM universidad
       ORDER BY nombre_universidad`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching universidades:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

app.post('/api/universidades', requireRole('admin'), async (req, res) => {
  try {
    const nombre_universidad = (req.body?.nombre_universidad || '').trim();
    const codigoRaw = (req.body?.codigo || '').trim();
    const codigo = codigoRaw || null;

    if (!nombre_universidad) {
      return res.status(400).json({ message: 'nombre_universidad requerido' });
    }

    const [result] = await pool.query(
      `INSERT INTO universidad (nombre_universidad, codigo)
       VALUES (?, ?)`,
      [nombre_universidad, codigo]
    );

    res.status(201).json({
      id_universidad: result.insertId,
      nombre_universidad,
      codigo,
    });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'La universidad o codigo ya existe' });
    }
    console.error('Error creating universidad:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

//==========DIRECTORIO INVESTIGADORES==========//

// Crear nuevo programa académico (refactor controller/service/repository)
const { crearPrograma } = require('./controller/programaController');
app.post('/api/programas', requireRole('admin', 'director'), crearPrograma);

// Crear nueva facultad (refactor controller/service/repository)
const { crearFacultad } = require('./controller/facultadController');
app.post('/api/facultades', requireRole('admin', 'director'), crearFacultad);

// Crear nuevo grupo (refactor controller/service/repository)
const { crearGrupo } = require('./controller/grupoController');
app.post('/api/grupos', requireRole('admin', 'director'), crearGrupo);

// add investigador route (refactor controller/service/repository)
const { crearInvestigador } = require('./controller/investigadorController');
app.post('/api/investigadores', requireRole('admin', 'coordinador'), crearInvestigador);

// update investigador by id (refactor controller/service/repository)
const { editarInvestigador } = require('./controller/investigadorController');
app.put('/investigadores/:id', requireRole('admin', 'coordinador'), editarInvestigador);
app.put('/api/investigadores/:id', requireRole('admin', 'coordinador'), editarInvestigador);

// Listar todas las facultades (todos los datos)
app.get('/api/facultades', async (_req, res) => {
  try {
    const actor = await getActorFromHeaders(_req.headers);
    const dataScope = buildDataScope(actor);
    const conditions = [];
    const params = [];

    if (Array.isArray(dataScope.id_facultades) && dataScope.id_facultades.length > 0) {
      conditions.push(`id_facultad IN (${dataScope.id_facultades.map(() => '?').join(',')})`);
      params.push(...dataScope.id_facultades);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM facultad ${whereClause} ORDER BY nombre_facultad`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching facultades:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

// Crear nuevo grupo
app.post('/api/grupos', requireRole('admin', 'director'), async (req, res) => {
  try {
    console.log('[DEBUG] POST /api/grupos headers:', req.headers);
    console.log('[DEBUG] POST /api/grupos body:', req.body);
    const { nombre_grupo, sigla_grupo, url } = req.body;
    if (!nombre_grupo || !url) {
      return res.status(400).json({ message: 'nombre_grupo y url requeridos' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO link_grouplab (nombre_grupo, sigla_grupo, url) VALUES (?, ?, ?)',
        [nombre_grupo, sigla_grupo || null, url]
      );
      console.log('[DEBUG] SQL insert grupo result:', result);
      res.json({ id: result.insertId, nombre_grupo, sigla_grupo, url });
    } catch (sqlErr) {
      console.error('[DEBUG] SQL insert grupo error:', sqlErr);
      res.status(500).json({ message: 'error al guardar grupo', error: sqlErr.message });
    }
  } catch (err) {
    console.error('Error creando grupo:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
});

const grupoController = require('./controller/grupoController');
app.get('/api/grupos', grupoController.listarGrupos);

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

      const [facCols] = await pool.query("SHOW COLUMNS FROM users WHERE Field = 'id_facultad'");
      if (facCols.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN id_facultad INT NULL');
        console.log('Added id_facultad column to users table');
      }

      const [groupCols] = await pool.query("SHOW COLUMNS FROM users WHERE Field = 'id_grupo'");
      if (groupCols.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN id_grupo INT NULL');
        console.log('Added id_grupo column to users table');
      }
    } catch (err) {
      console.error('Error checking/adding role column:', err.message);
    }

    const createUserScopeSql = `
      CREATE TABLE IF NOT EXISTS user_scope (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        scope_type ENUM('universidad', 'facultad', 'grupo', 'investigador') NOT NULL,
        scope_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_scope (user_id, scope_type, scope_id),
        CONSTRAINT fk_user_scope_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(createUserScopeSql);
    console.log('user_scope table ensured');

    try {
      await pool.query(
        `ALTER TABLE user_scope
         MODIFY COLUMN scope_type ENUM('universidad', 'facultad', 'grupo', 'investigador') NOT NULL`
      );
    } catch (scopeEnumErr) {
      console.error('Error updating user_scope enum values:', scopeEnumErr.message);
    }

    try {
      await pool.query(
        `INSERT IGNORE INTO user_scope (user_id, scope_type, scope_id)
         SELECT id, 'facultad', id_facultad
         FROM users
         WHERE id_facultad IS NOT NULL`
      );
      await pool.query(
        `INSERT IGNORE INTO user_scope (user_id, scope_type, scope_id)
         SELECT id, 'grupo', id_grupo
         FROM users
         WHERE id_grupo IS NOT NULL`
      );
    } catch (scopeMigrationErr) {
      console.error('Error migrating legacy user scope columns:', scopeMigrationErr.message);
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
        id_universidad INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    const createUniversidadSql = `
      CREATE TABLE IF NOT EXISTS universidad (
        id_universidad INT AUTO_INCREMENT PRIMARY KEY,
        nombre_universidad VARCHAR(255) NOT NULL UNIQUE,
        codigo VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(createUniversidadSql);
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

    try {
      const [facUniCols] = await pool.query("SHOW COLUMNS FROM facultad WHERE Field = 'id_universidad'");
      if (facUniCols.length === 0) {
        await pool.query('ALTER TABLE facultad ADD COLUMN id_universidad INT NULL');
        console.log('Added id_universidad column to facultad');
      }
    } catch (facUniColErr) {
      console.error('Error ensuring id_universidad column on facultad:', facUniColErr.message);
    }

    try {
      const [fkRows] = await pool.query(
        `SELECT CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'facultad'
           AND COLUMN_NAME = 'id_universidad'
           AND REFERENCED_TABLE_NAME = 'universidad'`
      );
      if (fkRows.length === 0) {
        await pool.query(
          'ALTER TABLE facultad ADD CONSTRAINT fk_facultad_universidad FOREIGN KEY (id_universidad) REFERENCES universidad(id_universidad)'
        );
        console.log('Added fk_facultad_universidad foreign key');
      }
    } catch (facUniFkErr) {
      console.error('Error ensuring fk_facultad_universidad:', facUniFkErr.message);
    }

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
      `INSERT IGNORE INTO universidad (nombre_universidad, codigo) VALUES (?, ?)` ,
      ['Universidad Adventista de Colombia', 'UNAC']
    );

    const [[defaultUniversidad]] = await pool.query(
      `SELECT id_universidad
       FROM universidad
       WHERE codigo = 'UNAC' OR nombre_universidad = 'Universidad Adventista de Colombia'
       ORDER BY id_universidad
       LIMIT 1`
    );

    await pool.query(
      `INSERT IGNORE INTO facultad (nombre_facultad) VALUES (?)`,
      ['Facultad de Ingeniería']
    );

    if (defaultUniversidad?.id_universidad) {
      await pool.query(
        `UPDATE facultad
         SET id_universidad = ?
         WHERE id_universidad IS NULL`,
        [defaultUniversidad.id_universidad]
      );
    }
    
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
    

    // Get program IDs
    const [programas] = await pool.query(`SELECT id_programa, nombre_programa FROM programa ORDER BY id_programa`);
    
    // NOTE: Do NOT auto-populate investigador_programa_facultad here
    // Relationships will be created when users add/edit investigators via the API
    // This prevents creating unwanted cross-join of all investigators with all programs
    
    console.log(`Created ${programas.length} programs. Relationships will be added via API when users assign programs to investigators.`);


    // Ensure link_grouplab table exists
    const ensureLinkGrouplabSql = `
      CREATE TABLE IF NOT EXISTS link_grouplab (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_grupo VARCHAR(255),
        sigla_grupo VARCHAR(255),
        url VARCHAR(512) NOT NULL,
        id_facultad INT NULL
      ) ENGINE=InnoDB;
    `;
    await pool.query(ensureLinkGrouplabSql);
    console.log('link_grouplab table ensured');

    try {
      const [linkFacCols] = await pool.query("SHOW COLUMNS FROM link_grouplab WHERE Field = 'id_facultad'");
      if (linkFacCols.length === 0) {
        await pool.query('ALTER TABLE link_grouplab ADD COLUMN id_facultad INT NULL');
        console.log('Added id_facultad column to link_grouplab');
      }
    } catch (err) {
      console.error('Error ensuring id_facultad on link_grouplab:', err.message);
    }

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
      SELECT 
        r.*, 
        IFNULL(rel.facultad, '') AS facultad, 
        IFNULL(rel.programa, '') AS programa,
        IFNULL(rel.sigla_grupo, '') AS sigla_grupo,
        i.nombre_completo AS investigador, 
        i.link_cvlac, 
        i.cedula,
        i.correo, 
        i.google_scholar, 
        i.orcid
      FROM resultados r
      LEFT JOIN investigadores i 
        ON r.id_investigador = i.id_investigador
      LEFT JOIN (
        SELECT
          ipf.id_investigador,
          
          MAX(f.nombre_facultad) AS facultad,

          GROUP_CONCAT(DISTINCT p.nombre_programa 
            ORDER BY p.nombre_programa 
            SEPARATOR ' / ') AS programa,

          GROUP_CONCAT(DISTINCT lg.sigla_grupo 
            ORDER BY lg.sigla_grupo 
            SEPARATOR ' / ') AS sigla_grupo

        FROM investigador_programa_facultad ipf

        LEFT JOIN facultad f 
          ON f.id_facultad = ipf.id_facultad

        LEFT JOIN programa p 
          ON p.id_programa = ipf.id_programa

        /* 🔥 RELACIÓN CORRECTA CON GRUPOS */
        LEFT JOIN investigador_grupo ig
          ON ig.id_investigador = ipf.id_investigador

        LEFT JOIN link_grouplab lg 
          ON lg.id = ig.id_grupo

        GROUP BY ipf.id_investigador
      ) rel 
        ON rel.id_investigador = r.id_investigador;
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
const investigadorController = require('./controller/investigadorController');
app.get('/api/investigadores', investigadorController.listarInvestigadores);

// get single investigador by id
app.get('/investigadores/:id', investigadorController.obtenerInvestigadorPorId);
app.get('/api/investigadores/:id', investigadorController.obtenerInvestigadorPorId);

// delete investigador by id
const deleteInvestigadorHandler = async (req, res) => {
  const { id } = req.params;
  try {
    // Primero borrar relaciones en investigador_grupo
    await pool.query('DELETE FROM investigador_grupo WHERE id_investigador = ?', [id]);
    // Borrar relaciones en investigador_programa_facultad
    await pool.query('DELETE FROM investigador_programa_facultad WHERE id_investigador = ?', [id]);
    // Luego borrar el investigador
    const [result] = await pool.query('DELETE FROM investigadores WHERE id_investigador = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting investigador:', err.message, err.stack);
    res.status(500).json({ message: 'internal server error', error: err.message });
  }
};

app.delete('/investigadores/:id', requireRole('admin'), deleteInvestigadorHandler);
app.delete('/api/investigadores/:id', requireRole('admin'), deleteInvestigadorHandler);


//================GET==============//
const resultadosController = require('./controller/resultadosController');
app.get('/api/resultados', resultadosController.getResultados);

const tablaNormalizadaFinalController = require('./controller/tablaNormalizadaFinalController');
app.get('/api/tabla-normalizada-final', tablaNormalizadaFinalController.getTablaNormalizadaFinal);

const tipologiaCantidadesController = require('./controller/tipologiaCantidadesController');
app.get('/api/tipologia-cantidades', tipologiaCantidadesController.getTipologiaCantidades);

const nodoHijoCantidadesController = require('./controller/nodoHijoCantidadesController');
app.get('/api/nodo-hijo-cantidades', nodoHijoCantidadesController.getNodoHijoCantidades);

const PORT = process.env.PORT || 4000;
// scraping endpoints (clean architecture)
app.post('/api/scraping/ejecutar', requireRole('admin', 'director'), scrapingController.ejecutar);
app.get('/api/scraping/progreso', requireRole('admin', 'director'), scrapingController.progreso);
app.post('/api/scraping/ejecutar-grouplab', requireRole('admin'), scrapingController.ejecutarGroupLab);
app.post('/api/scraping/ejecutar-completo', requireRole('admin'), scrapingController.ejecutarCompleto);

// global error handler (catches unhandled errors passed to next())
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({ message: 'internal server error', error: err.message || 'unknown' });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
