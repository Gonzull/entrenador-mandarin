import { speak } from './tts.js';
import { tongueDiagramSVG, tongueLegendHTML } from './tongueDiagrams.js';
import { CJK, plainPinyin } from './chars.js';

function initGrabadora(vocab, sibGroups) {
  const words = [...vocab, ...sibGroups.flat().map(w => ({ ...w, level: 'sib' }))];
  const select = document.getElementById('recWordSelect');
  let levelFilter = 'all';
  let filteredWords = words;

  function getSound(pin) {
    if (!pin) return null;
    let p = pin.toLowerCase().trim().split(' ')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (p.startsWith('zh')) return 'zh';
    if (p.startsWith('ch')) return 'ch';
    if (p.startsWith('sh')) return 'sh';
    if (p.startsWith('r')) return 'r';
    if (p.startsWith('z')) return 'z';
    if (p.startsWith('c')) return 'c';
    if (p.startsWith('s')) return 's';
    if (p.startsWith('j')) return 'j';
    if (p.startsWith('q')) return 'q';
    if (p.startsWith('x')) return 'x';
    return null;
  }

  function updateDiagram() {
    const w = filteredWords[select.value];
    const dia = document.getElementById('recTongueDiagram');
    if (dia && w) {
      const sound = getSound(w.pin);
      dia.innerHTML = tongueDiagramSVG(sound);
      document.getElementById('recTongueLegend').innerHTML = tongueLegendHTML(sound);
    }
  }

  function renderSelect() {
    filteredWords = levelFilter === 'all' ? words : words.filter(w => String(w.level) === String(levelFilter));
    select.innerHTML = '';
    const groups = {
      1: document.createElement('optgroup'),
      2: document.createElement('optgroup'),
      3: document.createElement('optgroup'),
      4: document.createElement('optgroup'),
      5: document.createElement('optgroup'),
      6: document.createElement('optgroup'),
      sib: document.createElement('optgroup')
    };
    groups[1].label = 'HSK 1';
    groups[2].label = 'HSK 2';
    groups[3].label = 'HSK 3';
    groups[4].label = 'HSK 4';
    groups[5].label = 'HSK 5';
    groups[6].label = 'HSK 6';
    groups.sib.label = 'Sibilantes (práctica extra)';
    filteredWords.forEach((w, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${w.han} (${w.pin}) — ${w.es}`;
      const grp = groups[w.level] || groups[1];
      grp.appendChild(opt);
    });
    // solo añadir grupos con opciones
    [1, 2, 3, 4, 5, 6, 'sib'].forEach(lv => { if (groups[lv].children.length) select.appendChild(groups[lv]); });
    if (filteredWords.length) {
      select.value = 0;
      updateHan();
    }
  }

  function updateHan() {
    const w = filteredWords[select.value];
    if (w) {
      document.getElementById('recHan').textContent = w.han;
      document.getElementById('recPinEs').textContent = `${w.pin} — ${w.es}`;
      updateDiagram();
    }
  }
  select.addEventListener('change', updateHan);
  document.getElementById('recLevelFilter').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#recLevelFilter .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    levelFilter = b.dataset.level;
    renderSelect();
  });
  renderSelect();

  // ---------- Buscador: por hanzi, pinyin (sin tonos) o significado ----------
  const searchInput = document.getElementById('recSearch');
  const searchResults = document.getElementById('recSearchResults');
  const MAX_RESULTS = 12;
  const plainEs = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const entries = words.map(w => {
    const es = plainEs(w.es);
    return { w, pin: plainPinyin(w.pin), es, esWords: es.split(/[^a-zñ]+/) };
  });

  // menor = mejor coincidencia; null = no coincide
  function rank(e, raw, q, qPin) {
    if (CJK.test(raw)) {
      if (e.w.han === raw) return 0;
      if (e.w.han.startsWith(raw)) return 1;
      return e.w.han.includes(raw) ? 2 : null;
    }
    if (qPin && e.pin === qPin) return 3;
    if (e.esWords.includes(q)) return 4;
    if (qPin.length >= 2 && e.pin.startsWith(qPin)) return 5;
    if (q.length >= 3 && e.es.includes(q)) return 6;
    return null;
  }

  function pickWord(w) {
    levelFilter = 'all';
    document.querySelectorAll('#recLevelFilter .lvlbtn').forEach(x => x.classList.toggle('active', x.dataset.level === 'all'));
    renderSelect();
    select.value = words.indexOf(w);
    updateHan();
    searchResults.innerHTML = '';
    searchInput.value = '';
    speak(w.han);
  }

  function renderSearch(query) {
    searchResults.innerHTML = '';
    const raw = query.trim();
    if (!raw) return;
    const q = plainEs(raw);
    const qPin = plainPinyin(raw);
    const seen = new Set(); // las palabras de sibilantes repiten algunas del vocabulario
    const matches = entries
      .map(e => ({ e, r: rank(e, raw, q, qPin) }))
      .filter(x => x.r !== null)
      .sort((a, b) => a.r - b.r || (Number(a.e.w.level) || 9) - (Number(b.e.w.level) || 9) || a.e.w.han.length - b.e.w.han.length)
      .map(x => x.e.w)
      .filter(w => {
        const k = `${w.han}|${w.pin}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, MAX_RESULTS);
    matches.forEach(w => {
      const row = document.createElement('div');
      row.className = 'hz-result';
      const han = document.createElement('span');
      han.className = 'han';
      han.textContent = w.han;
      const meta = document.createElement('span');
      meta.className = 'meta';
      const pin = document.createElement('b');
      pin.textContent = w.pin;
      meta.append(pin, ` — ${w.es}`);
      const tag = document.createElement('span');
      tag.className = 'lvltag';
      tag.textContent = w.level === 'sib' ? 'Sibilantes' : `HSK${w.level}`;
      row.append(han, meta, tag);
      row.addEventListener('click', () => pickWord(w));
      searchResults.appendChild(row);
    });
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'hz-result freeform';
      empty.textContent = 'Sin resultados. Escribe en caracteres chinos, pinyin o español.';
      searchResults.appendChild(empty);
    }
  }

  searchInput.addEventListener('input', e => renderSearch(e.target.value));

  document.getElementById('recPlayNative').addEventListener('click', () => {
    const w = filteredWords[select.value];
    if (w) speak(w.han);
  });

  let mediaRecorder,
    chunks = [],
    recording = false,
    recordedUrl = null;
  const toggleBtn = document.getElementById('recToggle');
  const playMineBtn = document.getElementById('recPlayMine');
  const player = document.getElementById('recAudioPlayer');
  const note = document.getElementById('recNote');

  toggleBtn.addEventListener('click', async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          recordedUrl = URL.createObjectURL(blob);
          playMineBtn.disabled = false;
          note.textContent = 'Grabación lista. Compárala con el audio nativo.';
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        recording = true;
        toggleBtn.textContent = '■ Detener';
        toggleBtn.classList.add('recording');
        note.textContent = 'Grabando…';
      } catch (err) {
        note.textContent = 'No se pudo acceder al micrófono. Revisa los permisos del navegador.';
      }
    } else {
      mediaRecorder.stop();
      recording = false;
      toggleBtn.textContent = '● Grabar';
      toggleBtn.classList.remove('recording');
    }
  });

  playMineBtn.addEventListener('click', () => {
    if (!recordedUrl) return;
    player.src = recordedUrl;
    player.style.display = 'block';
    player.play();
  });
}

export { initGrabadora };
