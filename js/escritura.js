import { store } from './storage.js';

const SRS_KEY = 'hanzi_srs_v1';
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
const DAY_MS = 86400000;

function loadSrs() {
  return store.get(SRS_KEY, {});
}

function srsKey(w) {
  return `${w.han}|${w.pin || ''}`;
}

function getEntry(srs, w) {
  if (!srs[srsKey(w)]) {
    srs[srsKey(w)] = { box: 0, due: 0, seen: 0, perfect: 0, mistakes: 0 };
  }
  return srs[srsKey(w)];
}

function recordResult(w, totalMistakes) {
  const srs = loadSrs();
  const e = getEntry(srs, w);
  e.seen++;
  e.mistakes += totalMistakes;
  if (totalMistakes === 0) {
    e.perfect++;
    e.box = Math.min(BOX_INTERVAL_DAYS.length - 1, e.box + 1);
  } else {
    e.box = Math.max(0, e.box - 1);
  }
  e.due = Date.now() + BOX_INTERVAL_DAYS[e.box] * DAY_MS;
  store.set(SRS_KEY, srs);
  return e;
}

function srsStats() {
  const srs = loadSrs();
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
  return { due, learning, mastered };
}

function nextDueLabel(e) {
  if (!e.seen) return 'nuevo';
  if (e.due <= Date.now()) return 'repasar hoy';
  const days = Math.ceil((e.due - Date.now()) / DAY_MS);
  return days === 1 ? 'mañana' : `en ${days} días`;
}

function initEscritura(vocab) {
  let levelFilter = 'all';
  let pool = [];
  let index = 0;
  let writerInstance = null;
  let currentWord = null;
  let isLooping = false;
  let loopTimeout = null;
  let loopGen = 0; // cambia en cada inicio/parada: descarta callbacks de animaciones anteriores

  const el = id => document.getElementById(id);

  function singleCharWords() {
    return vocab.filter(w => w.han.length === 1);
  }

  function wordPool() {
    const singles = singleCharWords();
    if (levelFilter === 'all') return singles;
    if (levelFilter === 'due') {
      const srs = loadSrs();
      const now = Date.now();
      const dueList = singles
        .filter(w => srs[srsKey(w)] && srs[srsKey(w)].seen > 0)
        .map(w => ({ w, e: srs[srsKey(w)] }))
        .filter(x => x.e.due <= now)
        .sort((a, b) => a.e.due - b.e.due)
        .map(x => x.w);
      if (dueList.length) return dueList;
      return singles
        .filter(w => srs[srsKey(w)] && srs[srsKey(w)].seen > 0)
        .sort((a, b) => srs[srsKey(a)].box - srs[srsKey(b)].box);
    }
    return singles.filter(w => w.level === Number(levelFilter));
  }

  function refreshStats() {
    const st = srsStats();
    el('srsDue').textContent = st.due;
    el('srsLearning').textContent = st.learning;
    el('srsMastered').textContent = st.mastered;
  }

  function setStatus(msg) {
    el('hanziStatus').textContent = msg;
  }

  function writerOptions() {
    return {
      width: 260,
      height: 260,
      padding: 12,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: '#F1E9DC',
      outlineColor: '#3A3025',
      radicalColor: '#B4432E',
      drawingWidth: 4,
      highlightColor: '#CBA35C',
      showHintAfterMisses: 1,
      charDataLoader: cachedCharDataLoader
    };
  }

  function cachedCharDataLoader(char, onComplete, onError) {
    const cacheKey = 'hz_data_' + char;
    const cached = store.get(cacheKey, null);
    if (cached && typeof cached === 'object') {
      onComplete(cached);
      return;
    }
    fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        store.set(cacheKey, data);
        onComplete(data);
      })
      .catch(onError);
  }

  function stopLoop() {
    isLooping = false;
    loopGen++;
    if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null; }
    const btn = el('hanziShow');
    if (btn) btn.textContent = '▶ Ver animación';
  }

  function loopAnimation(gen) {
    if (!isLooping || gen !== loopGen || !writerInstance) return;
    writerInstance.animateCharacter({
      onComplete: res => {
        // HanziWriter también llama onComplete al cancelar una animación; si eso
        // reprogramara el loop, cada reinicio cortaría al siguiente a los 800ms
        // y el carácter se quedaría repitiendo solo los primeros trazos
        if (!isLooping || gen !== loopGen || (res && res.canceled)) return;
        clearTimeout(loopTimeout);
        loopTimeout = setTimeout(() => loopAnimation(gen), 800);
      }
    });
  }

  function renderWord(w) {
    stopLoop();
    currentWord = w;
    const target = el('hanziTarget');
    el('hanziMeta').textContent =
      w.level ? `HSK${w.level} · ${w.pin} — ${w.es}` : `Carácter · ${w.pin || w.han}`;
    const srs = loadSrs();
    const e = srs[srsKey(w)];
    const info = e && e.seen
      ? `Visto ${e.seen} vez(es) · ${e.perfect} perfecto(s) · repaso ${nextDueLabel(e)}`
      : 'Nuevo carácter — practícalo para añadirlo al repaso.';
    el('hanziSrsInfo').textContent = info;
    setStatus('Toca "Ver animación" o "Practicar trazos".');
    target.innerHTML = '';
    if (typeof HanziWriter === 'undefined') {
      target.innerHTML =
        '<p style="padding:20px;color:var(--text-dim);font-size:13px;">No se pudo cargar el módulo de escritura. Revisa tu conexión a internet y recarga la página.</p>';
      writerInstance = null;
      return;
    }
    try {
      writerInstance = HanziWriter.create(target, w.han, writerOptions());
    } catch (err) {
      target.innerHTML =
        '<p style="padding:20px;color:var(--text-dim);font-size:13px;">No se encontró ese carácter en la base de datos de trazos.</p>';
      writerInstance = null;
    }
  }

  function pickNext() {
    stopLoop();
    pool = wordPool();
    if (!pool.length) {
      el('hanziTarget').innerHTML =
        '<p style="padding:20px;color:var(--text-dim);font-size:13px;">Nada por aquí todavía. Practica algunos caracteres y volverán aquí cuando toque repaso.</p>';
      el('hanziMeta').textContent = 'Repaso';
      el('hanziSrsInfo').textContent = '';
      writerInstance = null;
      currentWord = null;
      return;
    }
    index = Math.floor(Math.random() * pool.length);
    renderWord(pool[index]);
  }

  document.getElementById('hanziLevelFilter').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#hanziLevelFilter .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    levelFilter = b.dataset.level;
    pickNext();
  });

  el('hanziShow').addEventListener('click', () => {
    if (!writerInstance || !currentWord) return;
    if (!isLooping) {
      isLooping = true;
      el('hanziShow').textContent = '■ Detener';
      setStatus('Reproduciendo en loop - pulsa Detener para pausar');
      loopAnimation(++loopGen);
    } else {
      stopLoop();
      try { writerInstance.showCharacter(); } catch {}
      setStatus('Animación detenida. Pulsa "Ver animación" para reiniciar el loop.');
    }
  });

  el('hanziQuiz').addEventListener('click', () => {
    stopLoop();
    if (!writerInstance || !currentWord) return;
    setStatus('Dibuja cada trazo en orden. Si te equivocas, se corrige automáticamente.');
    writerInstance.quiz({
      onComplete: summary => {
        const e = recordResult(currentWord, summary.totalMistakes);
        refreshStats();
        el('hanziSrsInfo').textContent = `Visto ${e.seen} vez(es) · ${e.perfect} perfecto(s) · repaso ${nextDueLabel(e)}`;
        setStatus(
          summary.totalMistakes === 0
            ? '¡Perfecto! Cero errores — la próxima revisión se aleja un poco más.'
            : `Listo — ${summary.totalMistakes} error(es). Lo verás de nuevo más pronto.`
        );
        if (levelFilter === 'due') setTimeout(pickNext, 1600);
      }
    });
  });

  el('hanziNext').addEventListener('click', pickNext);

  function loadSpecificWord(w) {
    levelFilter = 'all';
    document.querySelectorAll('#hanziLevelFilter .lvlbtn').forEach(x =>
      x.classList.toggle('active', x.dataset.level === 'all')
    );
    renderWord(w);
  }

  function loadFreeHanzi(char) {
    const fake = { han: char, pin: '', es: '', level: 0 };
    renderWord(fake);
  }

  initHanziSearch(singleCharWords(), loadSpecificWord, loadFreeHanzi);

  refreshStats();
  pickNext();
}

function initHanziSearch(singles, onPick, onFree) {
  const input = document.getElementById('hanziSearch');
  const container = document.getElementById('hanziSearchResults');

  function render(query) {
    container.innerHTML = '';
    const q = query.trim().toLowerCase();
    if (!q) return;
    const matches = singles
      .filter(
        w =>
          w.han.includes(query.trim()) ||
          w.pin.toLowerCase().includes(q) ||
          w.es.toLowerCase().includes(q)
      )
      .slice(0, 8);
    matches.forEach(w => {
      const row = document.createElement('div');
      row.className = 'hz-result';
      row.innerHTML = `<span class="han">${w.han}</span><span class="meta"><b>${w.pin}</b> — ${w.es}</span><span class="lvltag">HSK${w.level}</span>`;
      row.addEventListener('click', () => {
        onPick(w);
        container.innerHTML = '';
        input.value = '';
      });
      container.appendChild(row);
    });
    const raw = query.trim();
    const isSingleCJK = raw.length === 1 && /[\u4e00-\u9fff]/.test(raw);
    if (isSingleCJK && !matches.some(m => m.han === raw)) {
      const row = document.createElement('div');
      row.className = 'hz-result freeform';
      row.textContent = `Cargar "${raw}" directamente (fuera de HSK1-3)`;
      row.addEventListener('click', () => {
        onFree(raw);
        container.innerHTML = '';
        input.value = '';
      });
      container.appendChild(row);
    }
    if (!matches.length && !isSingleCJK) {
      const empty = document.createElement('div');
      empty.className = 'hz-result freeform';
      empty.textContent = 'Sin resultados. Escribe un carácter chino, pinyin o palabra en español.';
      container.appendChild(empty);
    }
  }

  input.addEventListener('input', e => render(e.target.value));
}

export { initEscritura };
