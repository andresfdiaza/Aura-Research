export const assetImages = import.meta.glob('./assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
});

export const normalizeText = (text = '') =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const tokenize = (text = '') =>
  normalizeText(text)
    .split(/\s+/)
    .filter(Boolean);

export const tokenSimilar = (a = '', b = '') => {
  const aa = normalizeText(a);
  const bb = normalizeText(b);
  return aa === bb || aa.includes(bb) || bb.includes(aa);
};

export const getInvestigatorImage = (nombre) => {
  if (!nombre) return null;
  const normalizeText = (str) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, '')
      .toLowerCase()
      .trim();
  const tokenize = (str) => normalizeText(str).split(/\s+/).filter(Boolean);

  const normalizedName = normalizeText(nombre);
  const nameTokens = tokenize(nombre);
  if (!normalizedName || nameTokens.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const [path, src] of Object.entries(assetImages)) {
    const fileName = path.split('/').pop() || '';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const normalizedFileName = normalizeText(baseName);
    const fileTokens = tokenize(baseName);

    // Score: +2 por cada token exacto, +1 por substring, -1 por token faltante
    let score = 0;
    nameTokens.forEach(token => {
      if (fileTokens.includes(token)) score += 2;
      else if (normalizedFileName.includes(token)) score += 1;
      else score -= 1;
    });
    // Penalizar si el número de tokens difiere mucho
    score -= Math.abs(fileTokens.length - nameTokens.length);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = src;
    }
  }
  return bestScore > 0 ? bestMatch : null;
};

export const tipologiaToSigla = (tipologia = '') => {
  const value = normalizeText(tipologia);

  if (value.includes('nuevo conocimiento')) return 'NC';
  if (value.includes('desarrollo tecnologico') || value.includes('innovacion')) return 'DTI';
  if (value.includes('formacion del recurso humano')) return 'FRH';
  if (value.includes('apropiacion social')) return 'ASC';
  if (value.includes('divulgacion publica')) return 'DPC';

  return tipologia || 'Sin tipología';
};

export const getOrderedTipologiaData = (productosPorTipologia = {}) => {
  const order = ['NC', 'DTI', 'FRH', 'ASC', 'DPC'];

  const mapped = {};

  Object.entries(productosPorTipologia).forEach(([key, value]) => {
    const sigla = tipologiaToSigla(key);
    mapped[sigla] = (mapped[sigla] || 0) + value;
  });

  const labels = order.filter((sigla) => mapped[sigla] > 0);
  const values = labels.map((sigla) => mapped[sigla]);

  return { labels, values };
};

export const toTitleCase = (text = '') =>
  String(text)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const parseProgramas = (programa) => {
  if (!programa) return [];

  if (Array.isArray(programa)) return programa.filter(Boolean);

  return String(programa)
    .split(/[,;|]/)
    .map((p) => p.trim())
    .filter(Boolean);
};