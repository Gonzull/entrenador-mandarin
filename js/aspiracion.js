import { speak } from './tts.js';
import { parseSyllable } from './chars.js';

// inicial sin aire / con aire
const SERIES = [['b', 'p'], ['d', 't'], ['g', 'k'], ['j', 'q'], ['zh', 'ch'], ['z', 'c']];
const PER_SERIES = 2;

// Pares casi idénticos del vocabulario: misma terminación y mismo tono, y solo
// cambia la aspiración (低 dī / 踢 tī). Devuelve, por serie, una lista de pares
// donde cada lado es una lista de candidatos.
function buildPairs(chars) {
  const by = new Map();
  chars.forEach(c => {
    const s = parseSyllable(c.pin);
    if (c.poly || !s.tone) return;
    const key = `${s.initial}|${s.final}|${s.tone}`;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(c);
  });
  return SERIES.map(([plain, aspirated]) => {
    const pairs = [];
    by.forEach((list, key) => {
      const [initial, fin, tone] = key.split('|');
      const other = by.get(`${aspirated}|${fin}|${tone}`);
      if (initial === plain && other) pairs.push([list, other]);
    });
    return pairs;
  });
}

const pick = list => list[Math.floor(Math.random() * list.length)];

function initAspiracion(pairs, chars = []) {
  const list = document.getElementById('aspList');
  const bySeries = buildPairs(chars);

  function addRow([a, b]) {
    const row = document.createElement('div');
    row.className = 'pair-row';
    row.innerHTML = `
      <div class="pair-word"><button class="minibtn">&#9654;</button><div><span class="han">${a.han}</span> <span class="pin">${a.pin}</span><br><span class="tag no">sin aire</span></div></div>
      <div class="pair-word"><button class="minibtn">&#9654;</button><div><span class="han">${b.han}</span> <span class="pin">${b.pin}</span><br><span class="tag si">aire fuerte</span></div></div>
    `;
    const btns = row.querySelectorAll('.minibtn');
    btns[0].addEventListener('click', () => speak(a.han, { calm: true }));
    btns[1].addEventListener('click', () => speak(b.han, { calm: true }));
    list.appendChild(row);
  }

  // primera vez: los pares fijos de aspiracion.json; después, una selección nueva
  // del vocabulario con unos pocos pares por cada serie (b/p, d/t, g/k, j/q, zh/ch, z/c)
  function render(fresh) {
    list.innerHTML = '';
    if (!fresh) pairs.forEach(addRow);
    bySeries.forEach(seriesPairs => {
      const rest = [...seriesPairs];
      for (let i = 0; i < PER_SERIES && rest.length; i++) {
        const [a, b] = rest.splice(Math.floor(Math.random() * rest.length), 1)[0];
        addRow([pick(a), pick(b)]);
      }
    });
  }

  const more = document.getElementById('aspMore');
  if (more) {
    more.style.display = bySeries.some(s => s.length) ? '' : 'none';
    more.addEventListener('click', () => render(true));
  }
  render(false);
}

export { initAspiracion };
