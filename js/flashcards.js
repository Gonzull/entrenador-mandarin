import { store } from './storage.js';
import { speak } from './tts.js';
import { createLessonFilter } from './lessonFilter.js';

const SRS_KEY = 'flash_srs_v1';
const PREFS_KEY = 'flash_prefs_v1';
const RECORD_KEY = 'flash_record_v1';
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
const DAY_MS = 86400000;
// juego: preguntas por partida y puntos
const ROUND = 10;
const POINTS_OK = 10;
const POINTS_STREAK = 5; // extra desde el tercer acierto seguido
const POINTS_FAIL = 5;

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function keyOf(w) {
  return `${w.han}|${w.pin || ''}`;
}

function initFlashcards(vocab) {
  const el = id => document.getElementById(id);

  // una tarjeta por palabra
  const seenKeys = new Set();
  const words = vocab.filter(w => {
    const k = keyOf(w);
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });

  const srs = store.get(SRS_KEY, {});
  const prefs = { front: 'han', dir: 'zh-es', ...store.get(PREFS_KEY, {}) };
  let mode = 'cards';
  let level = 'all';

  const lessons = createLessonFilter(el('flashLesson'), () => restart());
  const byLevel = () => (Number.isNaN(Number(level)) ? words : words.filter(w => w.level === Number(level)));
  const isDue = w => {
    const e = srs[keyOf(w)];
    return !!e && e.seen > 0 && e.due <= Date.now();
  };

  function pool() {
    if (level === 'due') return words.filter(isDue);
    return lessons.apply(byLevel());
  }

  // ---------- Repaso espaciado (cajas Leitner por palabra) ----------
  function record(w, ok) {
    const k = keyOf(w);
    const e = srs[k] || (srs[k] = { box: 0, due: 0, seen: 0, ok: 0 });
    e.seen++;
    if (ok) {
      e.ok++;
      e.box = Math.min(BOX_INTERVAL_DAYS.length - 1, e.box + 1);
    } else {
      e.box = Math.max(0, e.box - 1);
    }
    e.due = Date.now() + BOX_INTERVAL_DAYS[e.box] * DAY_MS;
    store.set(SRS_KEY, srs);
    return e;
  }

  function refreshStats() {
    const now = Date.now();
    let due = 0,
      learning = 0,
      mastered = 0;
    for (const k in srs) {
      const e = srs[k];
      if (!e.seen) continue;
      if (e.due <= now) due++;
      else if (e.box >= 4) mastered++;
      else learning++;
    }
    el('flashDue').textContent = due;
    el('flashLearning').textContent = learning;
    el('flashMastered').textContent = mastered;
  }

  function nextDueLabel(e) {
    if (e.due <= Date.now()) return 'vuelve hoy';
    const days = Math.ceil((e.due - Date.now()) / DAY_MS);
    return days === 1 ? 'vuelve mañana' : `vuelve en ${days} días`;
  }

  function emptyMessage() {
    return level === 'due'
      ? 'Nada por repasar ahora. Las palabras que marques o falles volverán aquí cuando toque.'
      : 'No hay palabras con este filtro.';
  }

  // ---------- Tarjetas ----------
  let current = null;
  let flipped = false;
  const recent = []; // últimas tarjetas vistas, para no repetirlas enseguida

  function renderCard() {
    const w = current;
    const frontEs = prefs.front === 'es';
    el('flashHan').style.display = flipped || !frontEs ? '' : 'none';
    el('flashPin').style.display = flipped || prefs.front === 'hanpin' ? '' : 'none';
    el('flashEs').style.display = flipped || frontEs ? '' : 'none';
    el('flashTip').style.display = flipped ? 'none' : '';
    // con el español al frente, el audio delataría la respuesta
    el('flashPlay').style.display = flipped || !frontEs ? '' : 'none';
    el('flashFlip').textContent = flipped ? 'Ocultar' : 'Voltear';
    el('flashRate').style.display = flipped ? '' : 'none';
    el('flashCard').classList.toggle('flipped', flipped);
    el('flashHan').textContent = w.han;
    el('flashPin').textContent = w.pin;
    el('flashEs').textContent = w.es;
  }

  function nextCard() {
    const p = pool();
    el('flashEmpty').style.display = p.length ? 'none' : '';
    el('flashCardWrap').style.display = p.length ? '' : 'none';
    if (!p.length) {
      el('flashEmpty').textContent = emptyMessage();
      current = null;
      return;
    }
    const fresh = p.filter(w => !recent.includes(keyOf(w)));
    const cand = fresh.length ? fresh : p;
    // primero lo que toca repasar; luego palabras nuevas; al final, cualquiera
    const due = cand.filter(isDue).sort((a, b) => srs[keyOf(a)].due - srs[keyOf(b)].due);
    const unseen = cand.filter(w => !srs[keyOf(w)]);
    const rest = unseen.length ? unseen : cand;
    current = due[0] || rest[Math.floor(Math.random() * rest.length)];
    recent.push(keyOf(current));
    if (recent.length > 3) recent.shift();
    flipped = false;
    el('flashMeta').textContent =
      `HSK${current.level}` + (current.lesson ? ` · lección ${current.lesson}` : '') + ` · ${p.length.toLocaleString('es')} en este mazo`;
    const e = srs[keyOf(current)];
    el('flashInfo').textContent = e ? `Vista ${e.seen} vez(es) · ${e.ok} sabida(s)` : 'Palabra nueva';
    renderCard();
  }

  function flip() {
    if (!current) return;
    flipped = !flipped;
    renderCard();
    const card = el('flashCard');
    card.classList.remove('flip');
    void card.offsetWidth; // reinicia la animación
    card.classList.add('flip');
  }

  function rate(ok) {
    if (!current || !flipped) return;
    record(current, ok);
    refreshStats();
    nextCard();
  }

  el('flashCard').addEventListener('click', flip);
  el('flashFlip').addEventListener('click', flip);
  el('flashPlay').addEventListener('click', () => current && speak(current.han, { calm: true }));
  el('flashYes').addEventListener('click', () => rate(true));
  el('flashNo').addEventListener('click', () => rate(false));

  // ---------- Juego: cuatro opciones ----------
  let queue = [];
  let qi = 0;
  let score = 0;
  let streak = 0;
  let hits = 0;
  let missed = [];
  let question = null;

  function refreshScore() {
    el('fgNum').textContent = Math.min(qi + 1, queue.length);
    el('fgLen').textContent = queue.length;
    el('fgStreak').textContent = streak;
    el('fgScore').textContent = score;
    el('fgRecord').textContent = store.get(RECORD_KEY, 0);
  }

  function distractors(w) {
    const same = words.filter(x => x.level === w.level && x.han !== w.han && x.es !== w.es);
    // de español a chino, opciones del mismo largo: que el número de caracteres no delate la respuesta
    const sameLen = same.filter(x => x.han.length === w.han.length);
    const source = prefs.dir === 'es-zh' && sameLen.length >= 3 ? sameLen : same;
    const out = [];
    for (const x of shuffled(source)) {
      if (out.some(o => o.es === x.es || o.han === x.han)) continue;
      out.push(x);
      if (out.length === 3) break;
    }
    return out;
  }

  function showQuestion() {
    const w = (question = queue[qi]);
    const zhFirst = prefs.dir === 'zh-es';
    refreshScore();
    const prompt = el('fgPrompt');
    prompt.textContent = zhFirst ? w.han : w.es;
    prompt.classList.toggle('fc-prompt-es', !zhFirst);
    el('fgPin').textContent = '';
    el('fgListen').style.display = zhFirst ? '' : 'none';
    el('fgFeedback').textContent = '';
    el('fgNext').style.display = 'none';
    const wrap = el('fgChoices');
    wrap.className = 'choices ' + (zhFirst ? 'cy-choices' : 'fc-choices-han');
    wrap.innerHTML = '';
    shuffled([w, ...distractors(w)]).forEach(opt => {
      const b = document.createElement('button');
      b.className = 'choice ' + (zhFirst ? 'cy-choice' : 'fc-choice-han');
      b.textContent = zhFirst ? opt.es : opt.han;
      b.dataset.key = keyOf(opt);
      b.addEventListener('click', () => answer(b, opt));
      wrap.appendChild(b);
    });
  }

  function answer(btn, opt) {
    const w = question;
    const ok = keyOf(opt) === keyOf(w);
    let delta;
    if (ok) {
      hits++;
      streak++;
      delta = POINTS_OK + (streak >= 3 ? POINTS_STREAK : 0);
      score += delta;
    } else {
      streak = 0;
      delta = -Math.min(POINTS_FAIL, score);
      score += delta;
      missed.push(w);
      // lo fallado en el juego pasa al repaso de las tarjetas
      record(w, false);
      refreshStats();
    }
    btn.classList.add(ok ? 'correct' : 'wrong');
    el('fgChoices').querySelectorAll('.choice').forEach(x => {
      x.disabled = true;
      if (!ok && x.dataset.key === keyOf(w)) x.classList.add('correct');
    });
    el('fgPin').textContent = w.pin;
    el('fgListen').style.display = '';
    el('fgFeedback').textContent =
      (ok ? `¡Correcto! +${delta}` : `Incorrecto${delta ? ' ' + delta : ''}`) + ` · ${w.han} ${w.pin} — ${w.es}`;
    el('fgNext').textContent = qi + 1 < queue.length ? 'Siguiente →' : 'Ver resultado';
    el('fgNext').style.display = '';
    refreshScore();
  }

  function endRound() {
    const record0 = store.get(RECORD_KEY, 0);
    const isRecord = score > record0;
    if (isRecord) store.set(RECORD_KEY, score);
    refreshScore();
    el('fgPlay').style.display = 'none';
    el('fgEnd').style.display = '';
    el('fgEndScore').textContent = score;
    el('fgEndLine').textContent =
      `${hits} de ${queue.length} aciertos` + (isRecord ? ' · ¡nuevo récord!' : ` · récord: ${record0}`);
    const list = el('fgMissed');
    list.innerHTML = '';
    if (missed.length) {
      const title = document.createElement('p');
      title.className = 'rec-note';
      title.textContent = 'Fallaste estas; ya están en el repaso de Tarjetas:';
      list.appendChild(title);
      missed.forEach(w => {
        const row = document.createElement('div');
        row.className = 'fc-missed';
        const han = document.createElement('span');
        han.className = 'han';
        han.textContent = w.han;
        const meta = document.createElement('span');
        meta.className = 'meta';
        const pin = document.createElement('b');
        pin.textContent = w.pin;
        meta.append(pin, ` — ${w.es}`);
        row.append(han, meta);
        list.appendChild(row);
      });
    }
  }

  function startRound() {
    const p = pool();
    el('fgEmpty').style.display = p.length ? 'none' : '';
    el('fgCard').style.display = p.length ? '' : 'none';
    if (!p.length) {
      el('fgEmpty').textContent = emptyMessage();
      return;
    }
    queue = shuffled(p).slice(0, ROUND);
    qi = 0;
    score = 0;
    streak = 0;
    hits = 0;
    missed = [];
    el('fgPlay').style.display = '';
    el('fgEnd').style.display = 'none';
    showQuestion();
  }

  el('fgListen').addEventListener('click', () => question && speak(question.han, { calm: true }));
  el('fgNext').addEventListener('click', () => {
    qi++;
    if (qi < queue.length) showQuestion();
    else endRound();
  });
  el('fgAgain').addEventListener('click', startRound);

  // ---------- Filtros y modos ----------
  function restart() {
    nextCard();
    startRound();
  }

  function setActive(groupId, attr, value) {
    document.querySelectorAll(`#${groupId} .lvlbtn`).forEach(x => x.classList.toggle('active', x.dataset[attr] === value));
  }

  function onGroupClick(groupId, attr, handler) {
    el(groupId).addEventListener('click', e => {
      const b = e.target.closest('.lvlbtn');
      if (!b) return;
      setActive(groupId, attr, b.dataset[attr]);
      handler(b.dataset[attr]);
    });
  }

  onGroupClick('flashMode', 'mode', value => {
    mode = value;
    el('flashCards').style.display = mode === 'cards' ? '' : 'none';
    el('flashGame').style.display = mode === 'game' ? '' : 'none';
    // el repaso puede haber cambiado desde el otro modo
    if (mode === 'cards' && level === 'due') nextCard();
  });

  onGroupClick('flashLevel', 'level', value => {
    level = value;
    lessons.update(byLevel(), level);
    restart();
  });

  onGroupClick('flashFront', 'front', value => {
    prefs.front = value;
    store.set(PREFS_KEY, prefs);
    flipped = false;
    if (current) renderCard();
  });

  onGroupClick('flashDir', 'dir', value => {
    prefs.dir = value;
    store.set(PREFS_KEY, prefs);
    startRound();
  });

  setActive('flashFront', 'front', prefs.front);
  setActive('flashDir', 'dir', prefs.dir);
  refreshStats();
  restart();
}

export { initFlashcards };
