// Índice de caracteres: un registro por carácter del vocabulario, con su sílaba.
// Lo usan el buscador de Escritura y los ejercicios de oído (tonos, sibilantes, aspiración).
// El vocabulario trae palabras; muchos caracteres básicos solo aparecen dentro
// de palabras compuestas (们 en 我们, 校 en 学校). Aquí se separa cada palabra en
// caracteres y su pinyin en sílabas para poder buscarlos uno por uno.
const CJK = /[一-鿿]/;
const PIN_INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
const PIN_FINALS = ['iang', 'iong', 'uang', 'ang', 'eng', 'ong', 'iao', 'ian', 'ing', 'uai', 'uan', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'er', 'ia', 'ie', 'iu', 'in', 'ua', 'uo', 'ui', 'un', 'ue', 'a', 'o', 'e', 'i', 'u'];

// pinyin sin tonos ni signos, para comparar con lo que se escribe en un teclado normal
function plainPinyin(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
}

// Divide un pinyin pegado ("xuéxiào") en exactamente n sílabas (["xué","xiào"]).
// Devuelve null si no se puede. Ante varias divisiones posibles prefiere la que no
// deja sílabas internas empezando por vocal (regla del apóstrofo en pinyin).
function splitPinyin(pin, n) {
  const orig = [...String(pin || '').normalize('NFC')];
  const letters = [];
  const breaks = new Set(); // posiciones donde un apóstrofo o espacio obliga a cortar
  orig.forEach((ch, i) => {
    const p = plainPinyin(ch);
    if (p.length === 1) letters.push({ p, i });
    else breaks.add(letters.length);
  });
  const s = letters.map(l => l.p).join('');
  let best = null;
  function walk(pos, cuts, penalty) {
    if (best && penalty >= best.penalty) return;
    if (cuts.length === n) {
      if (pos === s.length) best = { cuts: [...cuts], penalty };
      return;
    }
    if (pos >= s.length) return;
    const rest = s.slice(pos);
    const init = PIN_INITIALS.find(x => rest.startsWith(x)) || '';
    const afterInit = rest.slice(init.length);
    for (const fin of PIN_FINALS) {
      if (!afterInit.startsWith(fin)) continue;
      const end = pos + init.length + fin.length;
      let crosses = false;
      for (let b = pos + 1; b < end; b++) if (breaks.has(b)) crosses = true;
      if (crosses) continue;
      cuts.push(end);
      walk(end, cuts, penalty + (!init && pos > 0 && !breaks.has(pos) ? 1 : 0));
      cuts.pop();
    }
    // erhua: una "r" suelta al final es la sílaba de 儿 (último recurso)
    if (rest === 'r' && cuts.length === n - 1) {
      cuts.push(pos + 1);
      walk(pos + 1, cuts, penalty + 2);
      cuts.pop();
    }
  }
  walk(0, [], 0);
  if (!best) return null;
  let start = 0;
  return best.cuts.map(end => {
    const syl = letters.slice(start, end).map(l => orig[l.i]).join('');
    start = end;
    return syl;
  });
}

// Un registro por carácter: primero las palabras de un solo carácter (sin
// repetidos, nivel más bajo) y luego los que solo existen dentro de compuestas.
function buildCharIndex(vocab) {
  const index = new Map();
  vocab
    .filter(w => w.han.length === 1)
    .forEach(w => {
      const prev = index.get(w.han);
      if (!prev || w.level < prev.level) index.set(w.han, w);
    });
  vocab
    .filter(w => w.han.length > 1)
    .sort((a, b) => a.level - b.level || a.han.length - b.han.length)
    .forEach(w => {
      const chars = [...w.han];
      const syls = chars.every(c => CJK.test(c)) ? splitPinyin(w.pin, chars.length) : null;
      chars.forEach((c, i) => {
        if (!CJK.test(c) || index.has(c)) return;
        index.set(c, {
          han: c,
          pin: syls ? syls[i] : '',
          es: `en ${w.han} (${w.pin}): ${w.es}`,
          level: w.level,
          fromWord: true
        });
      });
    });
  // poly: lectura ambigua para los ejercicios de oído, donde la voz sintética
  // lee el carácter suelto y elige una sola pronunciación. Lo es si el carácter
  // figura como palabra con dos lecturas (长 cháng/zhǎng, 只 zhǐ/zhī) o si solo
  // aparece dentro de palabras y con lecturas distintas.
  const asWord = new Map(), inWords = new Map();
  const note = (map, c, syl) => {
    if (!syl || !parseSyllable(syl).tone) return;
    if (!map.has(c)) map.set(c, new Set());
    map.get(c).add(syl.toLowerCase());
  };
  vocab.forEach(w => {
    const chars = [...w.han];
    if (chars.length === 1) return note(asWord, chars[0], w.pin);
    const syls = chars.every(c => CJK.test(c)) ? splitPinyin(w.pin, chars.length) : null;
    if (syls) chars.forEach((c, i) => note(inWords, c, syls[i]));
  });
  const size = (map, c) => (map.get(c) || new Set()).size;
  // nivel y lección del carácter: los de la primera palabra en que aparece
  // (学 se aprende con 学生 en HSK 1, aunque como palabra suelta figure más tarde)
  const firstSeen = new Map();
  vocab.forEach(w => {
    const rank = w.level * 100 + (w.lesson || 99);
    [...w.han].forEach(c => {
      if (CJK.test(c) && (!firstSeen.has(c) || rank < firstSeen.get(c).rank)) firstSeen.set(c, { rank, level: w.level, lesson: w.lesson });
    });
  });
  return [...index.values()].map(e => ({
    ...e,
    level: firstSeen.get(e.han).level,
    lesson: firstSeen.get(e.han).lesson,
    poly: size(asWord, e.han) > 1 || (size(asWord, e.han) === 0 && size(inWords, e.han) > 1)
  }));
}

const TONE_MARKS = { 1: 'āēīōūǖ', 2: 'áéíóúǘ', 3: 'ǎěǐǒǔǚ', 4: 'àèìòùǜ' };
const SYL_INITIALS = ['zh', 'ch', 'sh', ...PIN_INITIALS.filter(x => x.length === 1)];

// "zhǎng" → { initial: 'zh', final: 'ang', tone: 3 }  (tone 0 = átona; ü se trata como u)
function parseSyllable(pin) {
  const p = plainPinyin(pin);
  const initial = SYL_INITIALS.find(x => p.startsWith(x)) || '';
  let tone = 0;
  for (const ch of String(pin || '').toLowerCase()) for (const t in TONE_MARKS) if (TONE_MARKS[t].includes(ch)) tone = Number(t);
  return { initial, final: p.slice(initial.length), tone };
}

export { CJK, plainPinyin, splitPinyin, buildCharIndex, parseSyllable };
