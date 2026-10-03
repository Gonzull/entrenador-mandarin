import { loadKnowledgeBase } from './data.js';
import { initDiagnostico } from './diagnostico.js';
import { initTonos } from './tonos.js';
import { initSibilantes } from './sibilantes.js';
import { initAspiracion } from './aspiracion.js';
import { initGrabadora } from './grabadora.js';
import { initCorreccion } from './correccion.js';
import { initEscritura } from './escritura.js';
import { initOraciones } from './oraciones.js';
import { initProgreso } from './progreso.js';

function initTabs() {
  document.getElementById('tabs').addEventListener('click', e => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('section.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    // ruta relativa al <base href>: en GitHub Pages el SW vive en /entrenador-mandarin/sw.js
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

function showKBInfo(meta) {
  const el = document.getElementById('kbMeta');
  if (el) {
    el.textContent = `Base de conocimientos: ${meta.total.toLocaleString('es')} palabras HSK · ${meta.sentences} oraciones · actualizada ${meta.updated}`;
  }
}

async function boot() {
  initTabs();
  try {
    const kb = await loadKnowledgeBase();
    showKBInfo(kb.meta);
    document.getElementById('loadError').style.display = 'none';
    initDiagnostico(kb.diagnostico);
    initTonos(kb.vocab);
    initSibilantes(kb.sibilantes);
    initAspiracion(kb.aspiracion);
    initGrabadora(kb.vocab, kb.sibilantes);
    initCorreccion(kb.correccion);
    initEscritura(kb.vocab);
    initOraciones(kb.oraciones);
  } catch (err) {
    console.error(err);
    document.getElementById('loadError').style.display = 'flex';
  }
  initProgreso();
  registerServiceWorker();
}

boot();
