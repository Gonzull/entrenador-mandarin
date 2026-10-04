import { speak } from './tts.js';
import { tongueDiagramSVG, tongueLegendHTML } from './tongueDiagrams.js';
import { wordSyllables, targetSound, judge, describeDiffs } from './pinyinMatch.js';

// Conversor de hanzi a pinyin (lee palabras completas, polífonos y tradicionales).
// Se descarga la primera vez que se usa el micrófono; el Service Worker lo guarda.
const PINYIN_URL = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.29.4/+esm';
// formatos de grabación por orden de preferencia: Safari en iPhone no graba webm
const REC_TYPES = ['audio/webm', 'audio/mp4'];

function initCorreccion(words, vocab, chars) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const el = id => document.getElementById(id);
  let recognition = null;
  let current = null;
  let score = 0,
    total = 0;

  // Palabras practicables: la selección de correccion.json más todo el vocabulario
  // que tenga alguno de los sonidos del panel. Cada una lleva sus sílabas ya
  // separadas (syls), que es contra lo que se compara lo reconocido.
  const seen = new Set();
  const pool = [];
  const add = (w, level) => {
    const key = `${w.han}|${w.pin}`;
    if ([...w.han].length > 4 || seen.has(`${level}|${key}`)) return;
    const syls = wordSyllables(w.han, w.pin);
    const sound = syls && targetSound(syls);
    if (!sound) return;
    seen.add(`${level}|${key}`);
    pool.push({ han: w.han, pin: w.pin, es: w.es, sound: w.sound || sound, syls, level });
  };
  words.forEach(w => add(w, 'sel'));
  vocab.forEach(w => add(w, String(w.level)));
  let level = 'sel';

  // sin conexión la primera vez, se lee carácter por carácter con el índice del vocabulario
  const charPin = new Map(chars.map(c => [c.han, c.pin]));
  let pinyinLib = null;
  function loadPinyin() {
    if (!pinyinLib) {
      pinyinLib = import(PINYIN_URL)
        .then(m => m.pinyin)
        .catch(() => {
          pinyinLib = null;
          return null;
        });
    }
    return pinyinLib;
  }
  function reader(lib) {
    return han => {
      const list = [...han];
      const out = lib ? lib(han, { type: 'array' }) : [];
      return out.length === list.length ? out : list.map(c => charPin.get(c) || '');
    };
  }

  function showWord() {
    const list = pool.filter(w => w.level === level);
    current = list[Math.floor(Math.random() * list.length)];
    el('corrHan').textContent = current.han;
    el('corrPinEs').textContent = `${current.pin} — ${current.es}`;
    el('corrSoundTag').textContent = current.sound;
    // diagrama lengua + leyenda al lado derecho (tamaños en styles.css)
    let dia = el('tongueDiagram');
    if (!dia) {
      const wrapper = document.createElement('div');
      wrapper.className = 'tongue-wrap';
      dia = document.createElement('div');
      dia.id = 'tongueDiagram';
      dia.className = 'tongue-dia';
      const legend = document.createElement('div');
      legend.id = 'tongueLegend';
      legend.className = 'tongue-legend';
      wrapper.appendChild(dia);
      wrapper.appendChild(legend);
      const card = document.getElementById('corrCard');
      if (card) card.insertBefore(wrapper, card.querySelector('.quiz-stage') || card.firstChild);
    }
    dia.innerHTML = tongueDiagramSVG(current.sound);
    el('tongueLegend').innerHTML = tongueLegendHTML(current.sound);
    el('corrFeedback').innerHTML = '';
    el('corrHeard').textContent = '';
    el('corrStatus').textContent = 'Toca el micrófono y di la palabra claramente.';
  }

  function updateScore() {
    el('corrScore').textContent = score;
    el('corrTotal').textContent = total;
  }

  async function evaluate(transcripts) {
    const word = current;
    const lib = await loadPinyin();
    if (word !== current) return;
    const fb = el('corrFeedback');
    el('corrHeard').textContent = 'Se reconoció: "' + transcripts.join('" / "') + '"';
    const res = judge(word.syls, transcripts, reader(lib), word.han);
    const notes = m => describeDiffs(m, word.syls).join(' ');
    const same = m => (m.han === word.han ? `"${word.han}" (${word.pin})` : `"${m.han}" (${m.pin}), que suena igual que "${word.han}"`);

    if (res.verdict === 'none') {
      // no se pudo juzgar la pronunciación: no cuenta como intento
      fb.innerHTML = `<span style="color:var(--gold)">No pude relacionarlo con la palabra. Habla más cerca del micrófono, despacio y sin ruido de fondo, y vuelve a intentar.</span>`;
      el('corrStatus').textContent = 'Intenta de nuevo.';
      return;
    }
    total++;
    if (res.verdict === 'ok') {
      score++;
      fb.innerHTML = `<span style="color:var(--jade)">✓ ¡Muy bien! Se reconoció ${same(res.match)}.</span>`;
      el('corrStatus').textContent = 'Correcto — toca "Siguiente palabra" para continuar.';
    } else if (res.verdict === 'tone') {
      score++;
      fb.innerHTML = `<span style="color:var(--jade)">✓ Consonantes y vocales correctas.</span> <span style="color:var(--gold)">Ojo con el tono: se reconoció "${res.match.han}" (${res.match.pin}), ${notes(res.match)}</span>`;
      el('corrStatus').textContent = 'Repite cuidando el tono, o pasa a la siguiente palabra.';
    } else if (res.verdict === 'doubt') {
      const first = res.heard.kind === 'near' ? ` Lo primero que entendió fue "${res.heard.han}" (${res.heard.pin}). ${notes(res.heard)}` : '';
      fb.innerHTML = `<span style="color:var(--gold)">Dudoso — la palabra correcta apareció solo como alternativa del reconocedor, no como primera opción.${first}</span>`;
      el('corrStatus').textContent = 'Repítela más clara para confirmar.';
    } else {
      fb.innerHTML = `<span style="color:var(--seal)">✗ Casi — se reconoció "${res.match.han}" (${res.match.pin}). ${notes(res.match)}</span>`;
      el('corrStatus').textContent = 'Vuelve a intentar cuantas veces quieras.';
    }
    updateScore();
  }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && window.MediaRecorder && navigator.mediaDevices) {
    el('corrAI').style.display = 'flex';
    let whisper = null;
    let mediaRecorder = null;
    let chunks = [];
    function getWhisper() {
      if (!whisper) {
        el('corrStatus').textContent = 'Descargando modelo IA 77MB (primera vez, una sola vez)…';
        whisper = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js')
          .then(({ pipeline }) => pipeline('automatic-speech-recognition', 'Xenova/whisper-base'))
          .catch(e => {
            whisper = null;
            el('corrStatus').textContent = 'Error cargando IA: ' + e.message;
            return null;
          });
      }
      return whisper;
    }
    el('corrMicBtn').addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try { mediaRecorder.stop(); } catch {}
        return;
      }
      loadPinyin();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        el('corrStatus').textContent = 'Permiso de micrófono denegado.';
        return;
      }
      try {
        chunks = [];
        const mimeType = REC_TYPES.find(t => MediaRecorder.isTypeSupported(t));
        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          el('corrMicBtn').style.background = 'var(--jade)';
          if (!chunks.length) { el('corrStatus').textContent = 'No se grabó audio. Intenta de nuevo.'; return; }
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || chunks[0].type });
          const url = URL.createObjectURL(blob);
          try {
            const pipe = await getWhisper();
            if (!pipe) return;
            el('corrStatus').textContent = 'Transcribiendo con IA…';
            const res = await pipe(url, { language: 'chinese', task: 'transcribe' });
            const text = (res.text || '').trim();
            if (!text) { el('corrStatus').textContent = 'No se reconoció voz. Intenta de nuevo.'; return; }
            await evaluate([text]);
          } catch (e) {
            el('corrStatus').textContent = 'Error IA: ' + e.message;
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        mediaRecorder.start();
        el('corrStatus').textContent = 'Escuchando… (habla ahora, 3s)';
        el('corrMicBtn').style.background = 'var(--seal)';
        setTimeout(() => { try { if (mediaRecorder.state === 'recording') mediaRecorder.stop(); } catch {} }, 3500);
      } catch (e) {
        stream.getTracks().forEach(t => t.stop());
        el('corrStatus').textContent = 'Este navegador no pudo iniciar la grabación (' + e.message + ').';
      }
    });
  } else if (SpeechRec) {
    let listenTimeout = null;
    function createRecognition() {
      const rec = new SpeechRec();
      rec.lang = 'zh-CN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      rec.onstart = () => {
        el('corrStatus').textContent = 'Escuchando…';
        el('corrMicBtn').style.background = 'var(--seal)';
        clearTimeout(listenTimeout);
        listenTimeout = setTimeout(() => { try { rec.stop(); } catch {} }, 5000);
      };
      rec.onresult = event => {
        clearTimeout(listenTimeout);
        const alts = [];
        for (let i = 0; i < event.results[0].length; i++) {
          alts.push(event.results[0][i].transcript);
        }
        evaluate(alts);
      };
      rec.onerror = event => {
        clearTimeout(listenTimeout);
        const status = el('corrStatus');
        if (event.error === 'no-speech') status.textContent = 'No se detectó voz. Intenta de nuevo.';
        else if (event.error === 'not-allowed' || event.error === 'permission-denied')
          status.textContent = 'Permiso de micrófono denegado. Revisa los ajustes del navegador.';
        else if (event.error === 'network')
          status.textContent = 'Error de red — el reconocimiento de voz necesita conexión a internet.';
        else if (event.error === 'aborted') status.textContent = 'Escucha abortada. Intenta de nuevo.';
        else status.textContent = 'Ocurrió un error (' + event.error + '). Intenta de nuevo.';
      };
      rec.onend = () => {
        clearTimeout(listenTimeout);
        el('corrMicBtn').style.background = 'var(--jade)';
      };
      rec.onspeechend = () => { try { rec.stop(); } catch {} };
      return rec;
    }
    recognition = createRecognition();
    el('corrMicBtn').addEventListener('click', async () => {
      el('corrMicBtn').disabled = true;
      loadPinyin();
      try { recognition.abort(); } catch {}
      clearTimeout(listenTimeout);
      el('corrMicBtn').style.background = 'var(--jade)';
      el('corrStatus').textContent = 'Reiniciando micrófono…';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      } catch {}
      setTimeout(() => {
        recognition = createRecognition();
        try { recognition.start(); } catch (e) { el('corrStatus').textContent = 'No se pudo iniciar (' + e.message + '). Toca de nuevo.'; }
        el('corrMicBtn').disabled = false;
      }, 350);
    });
  } else {
    el('corrUnsupported').style.display = 'flex';
    el('corrMicBtn').disabled = true;
    el('corrMicBtn').style.opacity = '.4';
  }

  el('corrListen').addEventListener('click', () => speak(current.han, { calm: true }));
  el('corrNext').addEventListener('click', showWord);
  el('corrLevelFilter').addEventListener('click', e => {
    const b = e.target.closest('.lvlbtn');
    if (!b) return;
    document.querySelectorAll('#corrLevelFilter .lvlbtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    level = b.dataset.level;
    showWord();
  });
  showWord();
}

export { initCorreccion };
