import { store } from './storage.js';

const DAY_MS = 86400000;

function loadProgress() {
  // la racha solo vale si la última sesión fue hoy o ayer
  const last = store.get('lastLogDate', '');
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - DAY_MS).toDateString();
  const alive = last === today || last === yesterday;
  document.getElementById('statStreak').textContent = alive ? store.get('streak', 0) : 0;
  document.getElementById('statSessions').textContent = store.get('sessions', 0);
  const btn = document.getElementById('logSession');
  btn.disabled = last === today;
  btn.textContent = last === today ? 'Sesión de hoy registrada ✓' : 'Registrar sesión de hoy';
}

// vistos, dominados (caja 4 o más) y pendientes de repaso de un registro de repaso espaciado
function srsSummary(key) {
  const srs = store.get(key, {});
  const now = Date.now();
  let practiced = 0,
    mastered = 0,
    due = 0;
  for (const k in srs) {
    const e = srs[k];
    if (!e.seen) continue;
    practiced++;
    if (e.box >= 4) mastered++;
    if (e.due <= now) due++;
  }
  return { practiced, mastered, due };
}

function refreshStats() {
  const hanzi = srsSummary('hanzi_srs_v1');
  const flash = srsSummary('flash_srs_v1');
  document.getElementById('statChars').textContent = hanzi.practiced;
  document.getElementById('statMastered').textContent = hanzi.mastered;
  document.getElementById('statWords').textContent = flash.practiced;
  document.getElementById('statWordsMastered').textContent = flash.mastered;
  document.getElementById('statDue').textContent = hanzi.due + flash.due;
  document.getElementById('statRecord').textContent = store.get('flash_record_v1', 0);
}

function initProgreso() {
  loadProgress();
  refreshStats();

  // los números cambian al practicar en otras pestañas: se recalculan al abrir esta
  document.querySelector('#tabs button[data-tab="prog"]').addEventListener('click', () => {
    loadProgress();
    refreshStats();
  });

  document.getElementById('logSession').addEventListener('click', () => {
    const today = new Date().toDateString();
    const last = store.get('lastLogDate', '');
    if (last === today) return;
    const yesterday = new Date(Date.now() - DAY_MS).toDateString();
    const streak = last === yesterday ? store.get('streak', 0) + 1 : 1;
    store.set('streak', streak);
    store.set('sessions', store.get('sessions', 0) + 1);
    store.set('lastLogDate', today);
    loadProgress();
  });
}

export { initProgreso };
