// Comparación por sonido para Corrección por voz. El reconocedor devuelve hanzi,
// y comparar hanzi falla con homófonos (是 / 事) y con caracteres tradicionales.
// Aquí se pasa todo a pinyin y se compara inicial, final y tono sílaba por sílaba;
// el diagnóstico ("sonó como s en vez de sh") sale de esa diferencia.
import { CJK, splitPinyin, parseSyllable } from './chars.js';

// sonidos que entrena el panel, en el orden en que se busca el "sonido objetivo"
const TARGET_INITIALS = ['zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'j', 'q', 'x'];

const PLACE = { zh: 'retro', ch: 'retro', sh: 'retro', r: 'retro', z: 'dental', c: 'dental', s: 'dental', j: 'palatal', q: 'palatal', x: 'palatal' };
const PLACE_NAME = { retro: 'retrofleja', dental: 'dental', palatal: 'palatal' };
const PLACE_HINT = {
  retro: 'curva la punta de la lengua hacia atrás, hacia el paladar',
  dental: 'deja la punta de la lengua plana, justo detrás de los dientes',
  palatal: 'aplana la lengua contra el paladar, con la punta abajo y los labios en sonrisa'
};
// aspirada → su par sin aspirar
const ASPIRATED = { p: 'b', t: 'd', k: 'g', q: 'j', ch: 'zh', c: 'z' };
const UNASPIRATED = Object.fromEntries(Object.entries(ASPIRATED).map(([a, u]) => [u, a]));
const FRICATIVE = ['sh', 's', 'x'];
const AFFRICATE = ['zh', 'ch', 'z', 'c', 'j', 'q'];

// "lǜ" → { initial: 'l', final: 'ü', tone: 4, pin: 'lǜ' }. parseSyllable trata ü
// como u; aquí se distingue para no confundir lǜ con lù.
function syllable(pin) {
  const s = parseSyllable(pin);
  if (/[üǖǘǚǜ]/.test(String(pin).toLowerCase().normalize('NFC'))) s.final = s.final.replace('u', 'ü');
  return { ...s, pin };
}

// Sílabas de una palabra del vocabulario, o null si no se puede comparar
// (caracteres no chinos, pinyin que no se deja dividir, erhua como "wánr").
function wordSyllables(han, pin) {
  const chars = [...han];
  if (!chars.length || !chars.every(c => CJK.test(c))) return null;
  const parts = splitPinyin(pin, chars.length);
  if (!parts) return null;
  const syls = parts.map(syllable);
  return syls.every(s => s.final) ? syls : null;
}

function targetSound(syls) {
  const s = syls.find(x => TARGET_INITIALS.includes(x.initial));
  return s ? s.initial : null;
}

function compareWindow(target, heard) {
  const diffs = [];
  let dist = 0;
  target.forEach((want, i) => {
    const got = heard[i];
    if (!got) {
      dist += 2;
      return;
    }
    if (want.initial !== got.initial) {
      dist++;
      diffs.push({ i, part: 'initial', want, got });
    }
    if (want.final !== got.final) {
      dist++;
      diffs.push({ i, part: 'final', want, got });
    }
    // un tono neutro (en la palabra o en lo reconocido) no se compara
    if (want.tone && got.tone && want.tone !== got.tone) diffs.push({ i, part: 'tone', want, got });
  });
  return { dist, diffs };
}

// Compara una transcripción con la palabra. `read` convierte hanzi en un array
// de pinyin, uno por carácter; `han` es la palabra escrita. Devuelve kind:
//   'ok'   mismos sonidos y tonos       'tone' mismos sonidos, otro tono
//   'near' se parece (como mucho una parte distinta por sílaba)
//   'none' no se puede relacionar
function matchTranscript(target, text, read, han) {
  const chars = [...String(text || '')].filter(c => CJK.test(c));
  const n = target.length;
  // una frase mucho más larga que la palabra casi siempre contiene algo parecido por azar
  if (chars.length < n || chars.length > n + 2) return { kind: 'none' };
  const heard = read(chars.join('')).map(p => (p ? syllable(p) : null));
  let best = null;
  for (let start = 0; start + n <= chars.length; start++) {
    // el mismo hanzi es la misma palabra, aunque el conversor elija otra lectura (长 zhǎng / cháng)
    const same = chars.slice(start, start + n).join('') === han;
    const r = same ? { dist: 0, diffs: [] } : compareWindow(target, heard.slice(start, start + n));
    const tones = r.diffs.length - r.dist;
    if (!best || r.dist < best.dist || (r.dist === best.dist && tones < best.tones)) {
      best = { ...r, tones, han: chars.slice(start, start + n).join(''), pin: heard.slice(start, start + n).map(s => (s ? s.pin : '?')).join(' ') };
    }
  }
  const kind = best.dist > n ? 'none' : best.dist > 0 ? 'near' : best.tones ? 'tone' : 'ok';
  return { ...best, kind };
}

// Las alternativas del reconocedor vienen ordenadas de más a menos probable.
// Manda la primera: si la palabra correcta solo aparece más abajo, el resultado
// es dudoso y no cuenta como acierto.
function judge(target, transcripts, read, han) {
  const results = transcripts.map(t => matchTranscript(target, t, read, han));
  const isHit = r => r.kind === 'ok' || r.kind === 'tone';
  const first = results[0] || { kind: 'none' };
  if (isHit(first)) return { verdict: first.kind, match: first };
  const near = results.find(r => r.kind === 'near') || null;
  const later = results.find(isHit);
  if (later) return { verdict: 'doubt', match: later, heard: near || first };
  if (near) return { verdict: 'near', match: near };
  return { verdict: 'none' };
}

function initialNote(want, got) {
  if (!got) return `No se reconoció la consonante inicial "${want}".`;
  if (!want) return `Sobró una consonante al inicio: sonó "${got}".`;
  const head = `Sonó como "${got}" en vez de "${want}"`;
  const pw = PLACE[want], pg = PLACE[got];
  if (pw && pg && pw !== pg) {
    let note = `${head}: "${got}" es ${PLACE_NAME[pg]} y "${want}" es ${PLACE_NAME[pw]}. Para "${want}", ${PLACE_HINT[pw]}.`;
    if (ASPIRATED[want] && !ASPIRATED[got]) note += ' Además lleva un soplo de aire.';
    return note;
  }
  if (ASPIRATED[want] === got) return `${head}: faltó el soplo de aire. "${want}" se suelta con una bocanada que debería mover un papel frente a la boca.`;
  if (UNASPIRATED[want] === got) return `${head}: sobró aire. "${want}" se suelta sin soplo.`;
  if (FRICATIVE.includes(want) && AFFRICATE.includes(got)) return `${head}: en "${want}" la lengua no llega a tocar y el aire pasa de forma continua.`;
  if (AFFRICATE.includes(want) && FRICATIVE.includes(got)) return `${head}: en "${want}" la lengua toca primero y luego suelta el aire.`;
  if (want === 'r') return `${head}: "r" se hace con la lengua como en "sh", pero con voz.`;
  if (pw) return `${head}. Para "${want}", ${PLACE_HINT[pw]}.`;
  return `${head}.`;
}

function finalNote(want, got) {
  const head = `La final sonó "-${got}" en vez de "-${want}"`;
  if (want === got + 'g') return `${head}: termina con la parte de atrás de la lengua arriba (como la n de "tengo"), sin cerrar con la punta.`;
  if (got === want + 'g') return `${head}: termina con la punta de la lengua detrás de los dientes.`;
  return `${head}.`;
}

// Frases en español que explican las diferencias de un resultado
function describeDiffs(match, target) {
  return match.diffs.map(d => {
    const where = target.length > 1 ? `En "${d.want.pin}": ` : '';
    if (d.part === 'initial') return where + initialNote(d.want.initial, d.got.initial);
    if (d.part === 'final') return where + finalNote(d.want.final, d.got.final);
    return `${where}tono ${d.got.tone} en vez de tono ${d.want.tone}.`;
  });
}

export { TARGET_INITIALS, wordSyllables, targetSound, matchTranscript, judge, describeDiffs };
