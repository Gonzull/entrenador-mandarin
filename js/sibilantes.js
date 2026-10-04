import { speak } from './tts.js';
import { parseSyllable } from './chars.js';

// retrofleja / dental / palatal que se corresponden entre sí
const SERIES = [['zh', 'z', 'j'], ['ch', 'c', 'q'], ['sh', 's', 'x']];
// final tras zh/ch/sh y z/c/s → final equivalente tras j/q/x
const PALATAL_FINAL = { i: 'i', a: 'ia', e: 'ie', u: 'u', an: 'ian', ang: 'iang', ao: 'iao', ou: 'iu', en: 'in', eng: 'ing', ong: 'iong', uan: 'uan', un: 'un' };

// Arma tríos casi idénticos (misma terminación y mismo tono, distinta inicial)
// con los caracteres del vocabulario: 找 zhǎo / 早 zǎo / 角 jiǎo.
// Cada trío es una lista de candidatos por posición; en cada ronda se sortea uno.
function buildTrios(chars) {
  const by = new Map();
  chars.forEach(c => {
    const s = parseSyllable(c.pin);
    if (c.poly || !s.tone) return;
    const key = `${s.initial}|${s.final}|${s.tone}`;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(c);
  });
  const trios = [];
  SERIES.forEach(([retro, dental, palatal]) => {
    Object.keys(PALATAL_FINAL).forEach(fin => {
      for (let tone = 1; tone <= 4; tone++) {
        const trio = [by.get(`${retro}|${fin}|${tone}`), by.get(`${dental}|${fin}|${tone}`), by.get(`${palatal}|${PALATAL_FINAL[fin]}|${tone}`)];
        if (trio.every(Boolean)) trios.push(trio);
      }
    });
  });
  return trios;
}

const pick = list => list[Math.floor(Math.random() * list.length)];

function initSibilantes(groups, chars = []) {
  let score = 0,
    total = 0,
    streak = 0,
    currentSet = null,
    currentAnswer = null;

  const el = id => document.getElementById(id);
  // los grupos fijos de sibilantes.json más los tríos generados del vocabulario
  const trios = [...groups.map(g => g.map(w => [w])), ...buildTrios(chars)];

  // silent: prepara la ronda sin reproducir audio (carga inicial de la página)
  function newRound(silent) {
    currentSet = pick(trios).map(pick);
    currentAnswer = currentSet[Math.floor(Math.random() * 3)];
    el('sibFeedback').textContent = '';
    const wrap = el('sibChoices');
    wrap.innerHTML = '';
    const shuffled = [...currentSet].sort(() => Math.random() - 0.5);
    shuffled.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `${opt.han}<br><span style="font-size:11px;color:var(--text-dim)">${opt.pin}</span>`;
      b.addEventListener('click', () => answer(opt, b));
      wrap.appendChild(b);
    });
    if (silent !== true) speak(currentAnswer.han);
  }

  function answer(opt, btn) {
    total++;
    const fb = el('sibFeedback');
    if (opt.han === currentAnswer.han) {
      score++;
      streak++;
      btn.classList.add('correct');
      fb.textContent = `¡Correcto! ${currentAnswer.pin} — ${currentAnswer.es}`;
    } else {
      streak = 0;
      btn.classList.add('wrong');
      fb.textContent = `Era ${currentAnswer.han} (${currentAnswer.pin}) — ${currentAnswer.es}`;
    }
    el('sibScore').textContent = score;
    el('sibTotal').textContent = total;
    el('sibStreak').textContent = streak;
    document.querySelectorAll('#sibChoices .choice').forEach(c => (c.disabled = true));
    setTimeout(newRound, 1500);
  }

  el('sibPlay').addEventListener('click', () => speak(currentAnswer.han));
  newRound(true);

  return { groups, trios: trios.length };
}

export { initSibilantes };
