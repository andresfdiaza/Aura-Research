const fs = require('fs/promises');
const path = require('path');
const { parse, stringify } = require('csv/sync');
const pool = require('../db');
const { getActorFromHeaders } = require('../service/accessScopeService');
const { buildDataScope } = require('../service/accessScopeService');
const { listarInvestigadores } = require('../service/investigadorService');

function uniquePositiveIntegers(values = []) {
  return [...new Set(values.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))];
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function readCsv(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function sendCsv(res, fileName, rows) {
  if (!rows.length) {
    return res.status(404).json({ message: 'No hay datos para exportar' });
  }

  const csv = stringify(rows, { header: true });
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment(fileName);
  return res.send(csv);
}

async function getAllowedInvestigadorNames(actor) {
  const role = String(actor?.role || '').trim().toLowerCase();
  if (!actor || !role) return [];

  const dataScope = buildDataScope(actor);
  const investigadores = await listarInvestigadores(dataScope);
  return (investigadores || [])
    .map((r) => normalizeText(r.nombre_completo))
    .filter(Boolean);
}

async function getAllowedGroupScope(actor) {
  const role = String(actor?.role || '').trim().toLowerCase();
  const params = [];
  const conditions = [];

  if (role === 'director') {
    const universidadIds = uniquePositiveIntegers(actor.universidadIds || []);
    if (!universidadIds.length) return { ids: new Set(), siglas: new Set(), nombres: new Set() };
    conditions.push(`f.id_universidad IN (${universidadIds.map(() => '?').join(',')})`);
    params.push(...universidadIds);
  } else if (role === 'coordinador') {
    const groupIds = uniquePositiveIntegers(actor.grupoIds || []);
    const facultadIds = uniquePositiveIntegers(actor.facultadIds || []);
    const universidadIds = uniquePositiveIntegers(actor.universidadIds || []);

    const roleConditions = [];
    if (groupIds.length) {
      roleConditions.push(`lg.id IN (${groupIds.map(() => '?').join(',')})`);
      params.push(...groupIds);
    }
    if (facultadIds.length) {
      roleConditions.push(`lg.id_facultad IN (${facultadIds.map(() => '?').join(',')})`);
      params.push(...facultadIds);
    }
    if (universidadIds.length) {
      roleConditions.push(`f.id_universidad IN (${universidadIds.map(() => '?').join(',')})`);
      params.push(...universidadIds);
    }

    if (!roleConditions.length) return { ids: new Set(), siglas: new Set(), nombres: new Set() };
    conditions.push(`(${roleConditions.join(' OR ')})`);
  } else {
    return { ids: new Set(), siglas: new Set(), nombres: new Set() };
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT DISTINCT lg.id, lg.sigla_grupo, lg.nombre_grupo
     FROM link_grouplab lg
     LEFT JOIN facultad f ON f.id_facultad = lg.id_facultad
     ${where}`,
    params
  );

  return {
    ids: new Set(rows.map((r) => Number(r.id)).filter((id) => Number.isInteger(id) && id > 0)),
    siglas: new Set(rows.map((r) => normalizeText(r.sigla_grupo)).filter(Boolean)),
    nombres: new Set(rows.map((r) => normalizeText(r.nombre_grupo)).filter(Boolean)),
  };
}

async function descargarCvlacCSV(req, res) {
  try {
    const actor = await getActorFromHeaders(req.headers);
    if (!actor) return res.status(401).json({ message: 'No autenticado' });

    const csvPath = path.resolve(__dirname, '..', 'cv_datos_generales.csv');
    const rows = await readCsv(csvPath);
    const role = String(actor?.role || '').trim().toLowerCase();

    let filteredRows = rows;
    if (role !== 'admin') {
      const allowedNames = await getAllowedInvestigadorNames(actor);
      const allowedSet = new Set(allowedNames);
      filteredRows = rows.filter((row) => allowedSet.has(normalizeText(row.nombre)));
    }

    return sendCsv(res, 'cvlac.csv', filteredRows);
  } catch (err) {
    console.error('Error exportando CSV CVLAC desde archivo:', err);
    return res.status(500).json({ message: 'Error exportando CSV' });
  }
}

async function descargarGrouplabCSV(req, res) {
  try {
    const actor = await getActorFromHeaders(req.headers);
    const role = String(actor?.role || '').trim().toLowerCase();

    if (!actor || !role) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (role !== 'coordinador' && role !== 'director') {
      return res.status(403).json({ message: 'No tienes permisos para descargar Grouplab' });
    }

    const csvPath = path.resolve(__dirname, '..', 'titulos_grouplab_clean.csv');
    const rows = await readCsv(csvPath);
    const allowedScope = await getAllowedGroupScope(actor);

    const filteredRows = rows.filter((row) => {
      const id = Number(row.id_link_grouplab);
      const sigla = normalizeText(row.sigla_grupo_investigacion);
      const nombre = normalizeText(row.nombre_grupo_investigacion);

      return allowedScope.ids.has(id) || allowedScope.siglas.has(sigla) || allowedScope.nombres.has(nombre);
    });

    return sendCsv(res, 'grouplab.csv', filteredRows);
  } catch (err) {
    console.error('Error exportando CSV Grouplab desde archivo:', err);
    return res.status(500).json({ message: 'Error exportando CSV' });
  }
}

module.exports = {
  descargarCvlacCSV,
  descargarGrouplabCSV
};
