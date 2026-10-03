let zhVoice = null;

function pickVoice(){
  const voices = speechSynthesis.getVoices();
  const cnVoices = voices.filter(v => v.lang === 'zh-CN' || (v.lang && v.lang.startsWith('zh')));
  // Preferir voz femenina si está disponible, sino la primera
  let selected = cnVoices[0];
  const female = cnVoices.find(v => /femal|zira|hui|xiaoy|yun|jun|ting/i.test(v.name));
  if (female) selected = female;
  zhVoice = selected || null;
}
if ('speechSynthesis' in window){
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

function speak(text, opts={}){
  if (!('speechSynthesis' in window)) {
    alert('Tu navegador no soporta síntesis de voz.');
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  if (zhVoice) u.voice = zhVoice;
  // Modo aprendizaje: voz muy lenta y grave para estudiar
  if (opts.learning) {
    u.rate = 0.55;
    u.pitch = 0.8;
  }
  // Voz más calmada: reducir velocidad y añadir una pausa breve
  else if (opts.calm) {
    u.rate = 0.60;
    u.pitch = 0.9;
  }
  // Velocidad rápida
  else if (opts.fast) {
    u.rate = 1.1;
    u.pitch = 1.2;
  }
  // Velocidad normal mejorada: más lenta y natural
  else {
    u.rate = 0.70;
    u.pitch = 0.95;
  }
  // Ajuste fino opcional (p. ej. controles del panel de tonos)
  if (opts.rate) u.rate = opts.rate;
  if (opts.pitch) u.pitch = opts.pitch;
  u.volume = 1.0;
  speechSynthesis.speak(u);
}

export { speak, pickVoice };