const {
  updateInvestigador,
  deleteInvestigadorProgramaFacultad,
  deleteInvestigadorGrupo,
  getProgramaId,
  insertFacultadIfNotExists,
  insertInvestigadorProgramaFacultad,
  insertInvestigadorGrupo,
} = require('../repository/investigadorRepository');

async function updateInvestigadorService(id, data) {
  const { nombre_completo, cedula, link_cvlac, facultad, programa_academico, programas, correo, google_scholar, orcid, grupos } = data;
  const fields = {};
  if (nombre_completo !== undefined) fields.nombre_completo = nombre_completo;
  if (cedula !== undefined) fields.cedula = cedula;
  if (link_cvlac !== undefined) fields.link_cvlac = link_cvlac;
  if (correo !== undefined) fields.correo = correo;
  if (google_scholar !== undefined) fields.google_scholar = google_scholar;
  if (orcid !== undefined) fields.orcid = orcid;
  const affected = await updateInvestigador(id, fields);
  if (!affected) return null;

  // Actualizar facultad/programa
  if (facultad !== undefined || programa_academico !== undefined || programas !== undefined) {
    const facultadNombre = (facultad && String(facultad).trim()) || 'Facultad de Ingeniería';
    const idFacultad = await insertFacultadIfNotExists(facultadNombre);
    await deleteInvestigadorProgramaFacultad(id);
    const programasList = Array.isArray(programas)
      ? programas.filter(Boolean)
      : [programa_academico].filter(Boolean);
    for (const nombreProgramaRaw of programasList) {
      const nombrePrograma = String(nombreProgramaRaw).trim();
      if (!nombrePrograma) continue;
      const idPrograma = await getProgramaId(nombrePrograma, idFacultad);
      if (idPrograma) {
        await insertInvestigadorProgramaFacultad(id, idPrograma, idFacultad);
      }
    }
  }

  // Actualizar grupos
  if (Array.isArray(grupos)) {
    await deleteInvestigadorGrupo(id);
    for (const id_grupo of grupos) {
      await insertInvestigadorGrupo(id, id_grupo);
    }
  }

  // Return updated investigador (simplified)
  return { id_investigador: id, ...fields };
}

module.exports.updateInvestigadorService = updateInvestigadorService;
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