const {
  createInvestigador,
  insertFacultadIfNotExists,
  getProgramaId,
  insertInvestigadorProgramaFacultad,
  insertInvestigadorGrupo,
} = require('../repository/investigadorRepository');

async function addInvestigador(data) {
  const { nombre_completo, cedula, link_cvlac, facultad, programa_academico, programas, correo, google_scholar, orcid, grupos } = data;
  if (!nombre_completo) {
    const error = new Error('nombre_completo is required');
    error.status = 400;
    throw error;
  }
  try {
    // Insert investigador
    const id_investigador = await createInvestigador({ nombre_completo, cedula, link_cvlac, correo, google_scholar, orcid });

    // Facultad
    const facultadNombre = (facultad && String(facultad).trim()) || 'Facultad de Ingeniería';
    const idFacultad = await insertFacultadIfNotExists(facultadNombre);

    // Programas
    const programasList = Array.isArray(programas)
      ? programas.filter(Boolean)
      : [programa_academico].filter(Boolean);
    for (const nombreProgramaRaw of programasList) {
      const nombrePrograma = String(nombreProgramaRaw).trim();
      if (!nombrePrograma) continue;
      const idPrograma = await getProgramaId(nombrePrograma, idFacultad);
      if (idPrograma) {
        await insertInvestigadorProgramaFacultad(id_investigador, idPrograma, idFacultad);
      }
    }

    // Grupos
    if (Array.isArray(grupos) && grupos.length > 0) {
      for (const id_grupo of grupos) {
        await insertInvestigadorGrupo(id_investigador, id_grupo);
      }
    }

    return { id_investigador, nombre_completo, cedula, link_cvlac, facultad: facultadNombre, programa_academico, correo, google_scholar, orcid };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('Cédula already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = { addInvestigador };