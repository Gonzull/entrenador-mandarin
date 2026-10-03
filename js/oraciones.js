import { speak } from './tts.js';
import { store } from './storage.js';

const PREF_KEY = 'oraciones_prefs_v1';

// "我 想 喝 茶" + "wǒ xiǎng hē chá" → fichas [{han, pin}] y texto completo con puntuación
function parseSentence(s) {
  const hans = s.zh.split(' ');
  const pins = s.pin.split(' ');
  return {
    ...s,
    words: hans.map((han, i) => ({ han, pin: pins[i] || '' })),
    text: hans.join('') + (s.end || '')
  };
}

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function solutionHTML(s) {
  return `<span class="han">${s.text}</span><span class="pin">${s.pin}</span>`;
}

// Tablero de fichas: se tocan en el banco para ir armando la oración arriba.
// onSolved({ revealed, mistakes }) se llama una sola vez, al acertar o al pedir la respuesta.
function createBuilder(root, sentence, { showPinyin, onSolved }) {
  const target = sentence.words.map(w => w.han);
  let bank = shuffled(sentence.words.map((w, id) => ({ id, ...w })));
  // que no salga ya ordenada (salvo que todas las fichas sean iguales)
  for (let i = 0; i < 5 && bank.every((t, k) => t.han === target[k]) && new Set(target).size > 1; i++) {
    bank = shuffled(bank);
  }
  let answer = [];
  let mistakes = 0;
  let done = false;

  root.innerHTML = `
    <div class="ob-answer"></div>
    <div class="ob-bank"></div>
    <div class="feedback"></div>
    <div class="ob-actions">
      <button class="lvlbtn" data-act="clear">Borrar</button>
      <button class="lvlbtn" data-act="reveal">Ver respuesta</button>
    </div>`;
  const answerEl = root.querySelector('.ob-answer');
  const bankEl = root.querySelector('.ob-bank');
  const fb = root.querySelector('.feedback');

  function tileEl(t, extraClass) {
    const b = document.createElement('button');
    b.className = 'ob-tile' + (extraClass ? ' ' + extraClass : '');
    b.innerHTML = `<span class="han">${t.han}</span>` + (showPinyin ? `<span class="pin">${t.pin}</span>` : '');
    return b;
  }

  function finish(revealed) {
    done = true;
    root.querySelector('.ob-actions').style.display = 'none';
    bankEl.style.display = 'none';
    onSolved({ revealed, mistakes });
  }

  function render(wrongAt = []) {
    answerEl.innerHTML = '';
    if (!answer.length) answerEl.innerHTML = '<span class="ob-placeholder">Toca las fichas en orden</span>';
    answer.forEach((t, i) => {
      const b = tileEl(t, done ? 'correct' : wrongAt.includes(i) ? 'wrong' : '');
      if (!done) {
        b.addEventListener('click', () => {
          answer.splice(i, 1);
          fb.textContent = '';
          render();
        });
      } else b.disabled = true;
      answerEl.appendChild(b);
    });
    bankEl.innerHTML = '';
    bank.forEach(t => {
      const used = answer.includes(t);
      const b = tileEl(t, used ? 'used' : '');
      b.disabled = used || done;
      b.addEventListener('click', () => {
        answer.push(t);
        check();
      });
      bankEl.appendChild(b);
    });
  }

  function check() {
    if (answer.length < target.length) return render();
    const wrongAt = answer.map((t, i) => (t.han === target[i] ? -1 : i)).filter(i => i >= 0);
    if (!wrongAt.length) {
      fb.innerHTML = '<span style="color:var(--jade)">✓ ¡Correcto!</span>';
      finish(false);
      return render();
    }
    mistakes++;
    fb.innerHTML = '<span style="color:var(--seal)">✗ El orden no es correcto. Toca las fichas rojas para quitarlas y vuelve a intentar.</span>';
    render(wrongAt);
  }

  root.querySelector('[data-act="clear"]').addEventListener('click', () => {
    answer = [];
    fb.textContent = '';
    render();
  });
  root.querySelector('[data-act="reveal"]').addEventListener('click', () => {
    answer = target.map(h => bank.find(t => t.han === h));
    fb.innerHTML = '<span style="color:var(--gold)">Esta es la respuesta.</span>';
    finish(true);
    render();
  });

  render();
}

function initOraciones(data) {
  const el = id => document.getElementById(id);
  const prefs = { pinyin: true, trans: true, ...store.get(PREF_KEY, {}) };
  const dialogues = data.dialogues.map(d => ({
    ...d,
    lines: d.lines.map(l => parseSentence({ ...l, level: d.level, lesson: d.lesson }))
  }));
  // para armar sirven las oraciones sueltas y también cada línea de diálogo
  const buildable = [...data.sentences.map(parseSentence), ...dialogues.flatMap(d => d.lines)].filter(
    s => s.words.length >= 2
  );

  // ---------- Modo: armar oraciones ----------
  let levelFilter = 'all';
  let queue = [];
  let score = 0,
    total = 0,
    streak = 0;

  function nextSentence() {
    if (!queue.length) {
      queue = shuffled(buildable.filter(s => levelFilter === 'all' || s.level === Number(levelFilter)));
    }
    const s = queue.pop();
    if (!s) return;
    el('oracPrompt').textContent = s.es;
    el('oracMeta').textContent = `HSK${s.level}${s.lesson ? ` · lección ${s.lesson}` : ''} · ${s.words.length} fichas`;
    el('oracSolution').innerHTML = '';
    el('oracNext').style.display = 'none';
    createBuilder(el('oracBuilder'), s, {
      showPinyin: prefs.pinyin,
      onSolved: ({ revealed, mistakes }) => {
        total++;
        if (!revealed && mistakes === 0) {
          score++;
          streak++;
        } else streak = 0;
        el('oracScore').textContent = score;
        el('oracTotal').textContent = total;
        el('oracStreak').textContent = streak;
        el('oracSolution').innerHTML = `<div class="ob-solution">${solutionHTML(s)}<button class="playbtn" title="Escuchar">&#9654;</button></div>`;
        el('oracSolution').querySelector('.playbtn').addEventListener('click', () => speak(s.text, { calm: true }));
        el('oracNext').style.display = '';
      }
    });
  }

  el('oracLevel').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#oracLevel .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    levelFilter = b.dataset.level;
    queue = [];
    nextSentence();
  });
  el('oracNext').addEventListener('click', nextSentence);

  // ---------- Modo: diálogos ----------
  let dialogue = dialogues[0];
  let role = 'read'; // 'read' | 'A' | 'B'
  let step = 0;

  // un grupo por nivel HSK; dentro de cada uno van primero las lecciones del libro
  const groups = {};
  dialogues.forEach((d, i) => {
    if (!groups[d.level]) {
      groups[d.level] = document.createElement('optgroup');
      groups[d.level].label = `HSK ${d.level}`;
    }
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = d.title;
    groups[d.level].appendChild(opt);
  });
  Object.keys(groups).sort().forEach(lv => el('dlgSelect').appendChild(groups[lv]));

  function lineEl(line, mine) {
    const div = document.createElement('div');
    div.className = `dlg-line ${line.who === 'A' ? 'a' : 'b'}` + (mine ? ' me' : '');
    div.innerHTML =
      `<span class="who">${line.who}${mine ? ' (tú)' : ''}</span>` +
      `<div class="bubble"><span class="han">${line.text}</span>` +
      (prefs.pinyin ? `<span class="pin">${line.pin}</span>` : '') +
      (prefs.trans ? `<span class="es">${line.es}</span>` : '') +
      `</div><button class="playbtn" title="Escuchar">&#9654;</button>`;
    div.querySelector('.playbtn').addEventListener('click', () => speak(line.text, { calm: true }));
    return div;
  }

  function advance() {
    const lines = dialogue.lines;
    const turn = el('dlgTurn');
    turn.innerHTML = '';
    // las líneas del otro personaje (y las tuyas de una sola palabra) aparecen solas
    while (step < lines.length && (lines[step].who !== role || lines[step].words.length < 2)) {
      el('dlgLines').appendChild(lineEl(lines[step], lines[step].who === role));
      step++;
    }
    if (step >= lines.length) {
      turn.innerHTML = '<div class="feedback">Diálogo completo.</div><div class="ob-actions"><button class="lvlbtn" id="dlgRepeat">Repetir</button></div>';
      el('dlgRepeat').addEventListener('click', startDialogue);
      return;
    }
    const line = lines[step];
    turn.innerHTML = `<div class="dlg-prompt">Tu turno (${line.who}). Di en chino: <b>${line.es}</b></div><div id="dlgBuilder"></div>`;
    createBuilder(el('dlgBuilder'), line, {
      showPinyin: prefs.pinyin,
      onSolved: () => {
        el('dlgLines').appendChild(lineEl(line, true));
        step++;
        setTimeout(advance, 700);
      }
    });
  }

  function startDialogue() {
    el('dlgLines').innerHTML = '';
    el('dlgTurn').innerHTML = '';
    step = 0;
    if (role === 'read') dialogue.lines.forEach(l => el('dlgLines').appendChild(lineEl(l, false)));
    else advance();
  }

  el('dlgSelect').addEventListener('change', e => {
    dialogue = dialogues[e.target.value];
    startDialogue();
  });
  el('dlgRole').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#dlgRole .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    role = b.dataset.role;
    startDialogue();
  });

  // ---------- Opciones y cambio de modo ----------
  [['oracPinyin', 'pinyin'], ['oracTrans', 'trans']].forEach(([id, key]) => {
    el(id).checked = prefs[key];
    el(id).addEventListener('change', () => {
      prefs[key] = el(id).checked;
      store.set(PREF_KEY, prefs);
      // se vuelve a dibujar con la nueva opción (la oración en curso se cambia por otra)
      nextSentence();
      startDialogue();
    });
  });

  el('oracMode').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#oracMode .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    el('oracBuild').style.display = b.dataset.mode === 'build' ? '' : 'none';
    el('oracDialog').style.display = b.dataset.mode === 'dialog' ? '' : 'none';
  });

  nextSentence();
  startDialogue();
}

export { initOraciones };
