const DATA_FILES = [
  'hsk1',
  'hsk2',
  'hsk3',
  'hsk4',
  'hsk5',
  'diagnostico',
  'sibilantes',
  'aspiracion',
  'correccion',
  'oraciones'
];

const TONE_MAP = {
  'āēīōūǖ': 1,
  'áéíóúǘ': 2,
  'ǎěǐǒǔǚ': 3,
  'àèìòùǜ': 4
};

function computeTone(pin) {
  if (!pin) return 5;
  for (const ch of String(pin)) {
    for (const set in TONE_MAP) {
      if (set.includes(ch)) return TONE_MAP[set];
    }
  }
  return 5;
}

async function fetchJSON(name) {
  const res = await fetch(`data/${name}.json`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

async function loadKnowledgeBase() {
  const results = await Promise.all(DATA_FILES.map(fetchJSON));
  const [hsk1, hsk2, hsk3, hsk4, hsk5, diagnostico, sibilantes, aspiracion, correccion, oraciones] = results;

  const vocab = [
    ...hsk1.words.map(([han, pin, es]) => ({ level: 1, pin, han, es })),
    ...hsk2.words.map(([han, pin, es]) => ({ level: 2, pin, han, es })),
    ...hsk3.words.map(([han, pin, es]) => ({ level: 3, pin, han, es })),
    ...hsk4.words.map(([han, pin, es]) => ({ level: 4, pin, han, es })),
    ...hsk5.words.map(([han, pin, es]) => ({ level: 5, pin, han, es }))
  ].map(w => ({ ...w, tone: computeTone(w.pin) }));

  return {
    vocab,
    diagnostico: diagnostico.items,
    sibilantes: sibilantes.groups,
    aspiracion: aspiracion.pairs,
    correccion: correccion.words,
    oraciones: { dialogues: oraciones.dialogues, sentences: oraciones.sentences },
    meta: {
      // fecha más reciente entre todos los archivos de datos
      updated: results.map(r => r.updated || '').sort().pop(),
      // palabras distintas: los JSON traen algunas repetidas entre niveles
      total: new Set(vocab.map(w => `${w.han}|${w.pin}`)).size,
      sentences: oraciones.sentences.length + oraciones.dialogues.reduce((n, d) => n + d.lines.length, 0)
    }
  };
}

export { loadKnowledgeBase };