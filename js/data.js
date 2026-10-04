const DATA_FILES = [
  'hsk1',
  'hsk2',
  'hsk3',
  'hsk4',
  'hsk5',
  'hsk6',
  'diagnostico',
  'sibilantes',
  'aspiracion',
  'correccion',
  'oraciones',
  'chengyu'
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
  const [hsk1, hsk2, hsk3, hsk4, hsk5, hsk6, diagnostico, sibilantes, aspiracion, correccion, oraciones, chengyu] = results;

  // palabra: [han, pin, es, lección, marca]. La marca "extra" indica repaso extra del nivel:
  // palabras sin lección en los libros HSK Standard Course que sí están en el programa nuevo
  const toWord = level => ([han, pin, es, lesson, mark]) => ({ level, pin, han, es, lesson: lesson || undefined, extra: mark === 'extra' });
  const vocab = [
    ...hsk1.words.map(toWord(1)),
    ...hsk2.words.map(toWord(2)),
    ...hsk3.words.map(toWord(3)),
    ...hsk4.words.map(toWord(4)),
    ...hsk5.words.map(toWord(5)),
    ...hsk6.words.map(toWord(6))
  ].map(w => ({ ...w, tone: computeTone(w.pin) }));

  return {
    vocab,
    diagnostico: diagnostico.items,
    sibilantes: sibilantes.groups,
    aspiracion: aspiracion.pairs,
    correccion: correccion.words,
    oraciones: { dialogues: oraciones.dialogues, sentences: oraciones.sentences },
    chengyu: chengyu.items,
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