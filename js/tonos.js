import { speak } from './tts.js';
import { store } from './storage.js';

const VOICE_KEY = 'tone_voice_v1';
const VOICE_DEFAULT = { rate: 0.55, pitch: 0.8 };

const TONE_PATHS = {
  1: 'M4,7 L36,7',
  2: 'M4,17 Q14,17 36,4',
  3: 'M4,10 Q14,20 20,14 Q28,4 36,4',
  4: 'M4,4 Q10,4 36,20'
};

const TONE_COLORS = { 1: '#CBA35C', 2: '#5C8C77', 3: '#B4432E', 4: '#F1E9DC' };
const TONE_LABELS = { 1: 'alto y plano', 2: 'sube', 3: 'baja y sube', 4: 'cae fuerte' };

function toneShapeSVG(t, w = 40, h = 24) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 40 24"><path d="${TONE_PATHS[t]}" fill="none" stroke="${TONE_COLORS[t]}" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function renderToneGuide() {
  const guide = document.getElementById('toneGuide');
  [1, 2, 3, 4].forEach(t => {
    const d = document.createElement('div');
    d.className = 'tg-item';
    d.innerHTML = `${toneShapeSVG(t, 44, 26)}<span>Tono ${t}<br>${TONE_LABELS[t]}</span>`;
    guide.appendChild(d);
  });
}

function initTonos(vocab) {
  let levelFilter = 'all';
  let score = 0,
    total = 0,
    streak = 0,
    current = null;

  const el = id => document.getElementById(id);

  // velocidad y altura de la voz, ajustables y recordadas entre sesiones
  const voice = { ...VOICE_DEFAULT, ...store.get(VOICE_KEY, {}) };
  const say = () => current && speak(current.han, { learning: true, rate: voice.rate, pitch: voice.pitch });
  [['toneRate', 'rate'], ['tonePitch', 'pitch']].forEach(([id, key]) => {
    const input = el(id);
    if (!input) return;
    input.value = voice[key];
    el(id + 'Val').textContent = voice[key].toFixed(2);
    input.addEventListener('input', () => {
      voice[key] = Number(input.value);
      el(id + 'Val').textContent = voice[key].toFixed(2);
    });
    input.addEventListener('change', () => {
      store.set(VOICE_KEY, voice);
      say();
    });
  });

  function wordPool() {
    return vocab.filter(
      w =>
        w.han.length === 1 &&
        w.tone !== 5 &&
        (levelFilter === 'all' || w.level === Number(levelFilter))
    );
  }

  function newRound() {
    const pool = wordPool();
    if (!pool.length) return;
    current = pool[Math.floor(Math.random() * pool.length)];
    el('toneHan').textContent = current.han;
    el('toneWordMeta').textContent = `HSK${current.level} · toca el altavoz, luego elige el tono`;
    el('toneFeedback').textContent = '';
    const wrap = el('toneChoices');
    wrap.innerHTML = '';
    [1, 2, 3, 4].forEach(t => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `${toneShapeSVG(t)}<span>Tono ${t}</span>`;
      b.addEventListener('click', () => answer(t, b));
      wrap.appendChild(b);
    });
    say();
  }

  function answer(t, btn) {
    total++;
    const fb = el('toneFeedback');
    if (t === current.tone) {
      score++;
      streak++;
      btn.classList.add('correct');
      fb.textContent = `¡Correcto! ${current.pin} — ${current.es}`;
    } else {
      streak = 0;
      btn.classList.add('wrong');
      fb.textContent = `Era tono ${current.tone}: ${current.pin} (${current.es})`;
    }
    el('toneScore').textContent = score;
    el('toneTotal').textContent = total;
    el('toneStreak').textContent = streak;
    document.querySelectorAll('#toneChoices .choice').forEach(c => (c.disabled = true));
    setTimeout(newRound, 1400);
  }

  renderToneGuide();

  document.getElementById('toneLevelFilter').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#toneLevelFilter .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    levelFilter = b.dataset.level;
    newRound();
  });

  el('tonePlay').addEventListener('click', say);
  newRound();
}

export { initTonos };
