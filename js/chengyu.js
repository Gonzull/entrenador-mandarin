import { speak } from './tts.js';
import { createLessonFilter } from './lessonFilter.js';

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// items: fichas de chengyu.json · vocab: para saber en qué lección del libro aparece cada una
function initChengyu(items, vocab) {
  const el = id => document.getElementById(id);
  const lessonOf = new Map(vocab.filter(w => w.lesson).map(w => [w.han, { level: w.level, lesson: w.lesson }]));
  const cards = items.map(it => ({ ...it, ...(lessonOf.get(it.han) || {}) }));

  const lessons = createLessonFilter(el('cyLesson'), () => start());
  // todas las fichas con lección son de un mismo nivel (HSK 6); se pasa ese nivel al selector
  const level = (cards.find(c => c.level) || {}).level || 6;
  lessons.update(cards, level);

  let deck = [];
  let pos = 0;

  // ---------- Fichas ----------
  function showCard() {
    const c = deck[pos];
    if (!c) return;
    el('cyCount').textContent = `${pos + 1} / ${deck.length}` + (c.lesson ? ` · HSK${c.level} lección ${c.lesson}` : '');
    el('cyHan').textContent = c.han;
    el('cyPin').textContent = c.pin;
    el('cyBody').innerHTML =
      `<p><b>Literal:</b> ${c.lit}</p>` +
      `<p><b>Significado:</b> ${c.sig}</p>` +
      `<p><b>Uso:</b> ${c.uso}</p>` +
      (c.origen ? `<p><b>Origen:</b> ${c.origen}</p>` : '') +
      `<div class="cy-ex"><span class="han">${c.ej.zh}</span><span class="pin">${c.ej.pin}</span><span class="es">${c.ej.es}</span></div>`;
  }

  el('cyPrev').addEventListener('click', () => {
    pos = (pos - 1 + deck.length) % deck.length;
    showCard();
  });
  el('cyNext').addEventListener('click', () => {
    pos = (pos + 1) % deck.length;
    showCard();
  });
  el('cyPlay').addEventListener('click', () => deck[pos] && speak(deck[pos].han, { calm: true }));
  el('cyPlayEx').addEventListener('click', () => deck[pos] && speak(deck[pos].ej.zh, { calm: true }));

  // ---------- Quiz: elegir el significado ----------
  let score = 0,
    total = 0,
    current = null;

  function newQuestion() {
    current = deck[Math.floor(Math.random() * deck.length)];
    if (!current) return;
    el('cyQHan').textContent = current.han;
    el('cyQPin').textContent = current.pin;
    el('cyFeedback').textContent = '';
    el('cyQNext').style.display = 'none';
    // distractores de todo el mazo completo, para que siempre haya cuatro opciones
    const others = shuffled(cards.filter(c => c.han !== current.han)).slice(0, 3);
    const wrap = el('cyChoices');
    wrap.innerHTML = '';
    shuffled([current, ...others]).forEach(opt => {
      const b = document.createElement('button');
      b.className = 'choice cy-choice';
      b.textContent = opt.sig;
      b.addEventListener('click', () => {
        total++;
        const ok = opt.han === current.han;
        if (ok) score++;
        b.classList.add(ok ? 'correct' : 'wrong');
        wrap.querySelectorAll('.choice').forEach(x => {
          x.disabled = true;
          if (!ok && x.textContent === current.sig) x.classList.add('correct');
        });
        el('cyScore').textContent = score;
        el('cyTotal').textContent = total;
        el('cyFeedback').textContent = `Literal: ${current.lit}.`;
        el('cyQNext').style.display = '';
      });
      wrap.appendChild(b);
    });
  }
  el('cyQNext').addEventListener('click', newQuestion);

  function start() {
    deck = lessons.apply(cards);
    pos = 0;
    showCard();
    newQuestion();
  }

  el('cyMode').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#cyMode .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    el('cyCards').style.display = b.dataset.mode === 'cards' ? '' : 'none';
    el('cyQuiz').style.display = b.dataset.mode === 'quiz' ? '' : 'none';
  });

  start();
}

export { initChengyu };
