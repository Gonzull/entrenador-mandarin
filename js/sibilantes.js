import { speak } from './tts.js';

function initSibilantes(groups) {
  let score = 0,
    total = 0,
    streak = 0,
    currentSet = null,
    currentAnswer = null;

  const el = id => document.getElementById(id);

  // silent: prepara la ronda sin reproducir audio (carga inicial de la página)
  function newRound(silent) {
    currentSet = groups[Math.floor(Math.random() * groups.length)];
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

  return { groups };
}

export { initSibilantes };
