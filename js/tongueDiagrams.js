// Diagramas sagitales (corte lateral de la boca, mirando a la izquierda)
// para zh/ch/sh/r/z/c/s/j/q/x. Colores de la paleta del proyecto.
const PALATE = 'M30 44 Q34 38 40 36 Q60 22 82 30 Q96 35 102 50';
const LIP_UP = 'M26 40 Q12 40 12 49 Q14 55 24 52 Z';
const LIP_LOW = 'M24 66 Q13 64 12 72 Q13 82 26 80 Z';
const TEETH_UP = 'M27 42 L31 42 L30 57 L26 54 Z';
const TEETH_LOW = 'M27 78 L31 78 L30 63 L26 66 Z';
// suelo de la boca: cierra todas las lenguas desde (42,88) hasta la raíz
const FLOOR = ' Q50 98 70 98 Q95 98 104 84 Z';

// Cada lengua: raíz (104,66) → dorso → punta → cara inferior hasta (42,88)
const RETRO_TOUCH = 'M104 66 Q86 56 72 58 Q58 59 55 47 Q53 37 47 35 Q37 38 37 54 Q37 70 42 88';
const DENTAL_TOUCH = 'M104 66 Q80 46 52 52 Q40 53 32 50 Q30 56 36 62 Q41 72 42 88';
const PALATAL_TOUCH = 'M104 64 Q84 40 62 31 Q52 28 46 36 Q38 50 33 62 Q32 68 37 72 Q41 80 42 88';

// tongue: forma · at: punto de articulación · touch: la lengua toca (africada) o deja paso (fricativa)
// air: 'soft' casi sin aire · 'puff' soplo fuerte · 'flow' aire continuo · voiced: vibran las cuerdas
const SOUNDS = {
  // retroflejas: punta levantada hacia atrás, detrás de la encía
  zh: { tongue: RETRO_TOUCH, at: [46, 34], touch: true, air: 'soft', label: 'zh: punta atrás, toca y suelta' },
  ch: { tongue: RETRO_TOUCH, at: [46, 34], touch: true, air: 'puff', label: 'ch: igual que zh + soplo' },
  sh: { tongue: 'M104 66 Q86 56 72 59 Q59 60 56 50 Q54 42 48 40 Q38 43 38 57 Q38 72 42 88', at: [47, 36], touch: false, air: 'flow', label: 'sh: punta atrás, sin tocar' },
  r:  { tongue: 'M104 66 Q86 57 74 59 Q62 60 59 51 Q57 43 51 41 Q41 44 40 58 Q39 72 42 88', at: [50, 36], touch: false, air: 'flow', voiced: true, label: 'r: como sh, pero con voz' },
  // dentales: lengua plana, punta contra los dientes
  z:  { tongue: DENTAL_TOUCH, at: [33, 49], touch: true, air: 'soft', label: 'z: punta tras dientes, toca' },
  c:  { tongue: DENTAL_TOUCH, at: [33, 49], touch: true, air: 'puff', label: 'c: igual que z + soplo' },
  s:  { tongue: 'M104 66 Q80 48 52 55 Q42 57 33 62 Q32 68 37 72 Q41 80 42 88', at: [36, 54], touch: false, air: 'flow', label: 's: punta abajo, aire continuo' },
  // palatales: punta abajo, dorso elevado hacia el paladar duro
  j:  { tongue: PALATAL_TOUCH, at: [54, 31], touch: true, air: 'soft', label: 'j: dorso al paladar, toca' },
  q:  { tongue: PALATAL_TOUCH, at: [54, 31], touch: true, air: 'puff', label: 'q: igual que j + soplo' },
  x:  { tongue: 'M104 66 Q84 45 62 37 Q52 34 46 42 Q38 53 33 62 Q32 68 37 72 Q41 80 42 88', at: [54, 33], touch: false, air: 'flow', label: 'x: dorso cerca, aire continuo' }
};

const AIR = {
  soft: '<path d="M18 60 L11 60" stroke="#CBA35C" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>',
  puff: '<path d="M18 56 L5 51 M18 60 L3 60 M18 64 L5 69" stroke="#CBA35C" stroke-width="1.8" stroke-linecap="round"/>',
  flow: '<path d="M18 60 q-2.5 -4 -5 0 t-5 0 t-5 0" fill="none" stroke="#CBA35C" stroke-width="1.4" stroke-linecap="round"/>'
};

const SVG_OPEN = '<svg width="100%" height="100%" viewBox="0 0 120 120" style="display:block;background:var(--bg-soft);border:1px solid var(--gold);border-radius:8px">';

export const TONGUE_LEGEND_HTML =
  '<span style="color:#CBA35C">━</span> Paladar<br>' +
  '<span style="display:inline-block;width:10px;height:8px;background:#F1E9DC;border:1px solid #5C8C77;vertical-align:middle"></span> Dientes<br>' +
  '<span style="display:inline-block;width:10px;height:8px;background:#B4432E;vertical-align:middle"></span> Lengua<br>' +
  '<span style="color:#F1E9DC">●</span> toca &nbsp;<span style="color:#F1E9DC">○</span> no toca<br>' +
  '<span style="color:#CBA35C">≡</span> soplo &nbsp;<span style="color:#CBA35C">∿</span> aire continuo';

// Descripción corta del sonido (vacía si no hay diagrama)
export function tongueLabel(sound) {
  return SOUNDS[sound] ? SOUNDS[sound].label : '';
}

// Leyenda lateral: descripción del sonido actual + claves del dibujo
export function tongueLegendHTML(sound) {
  const label = tongueLabel(sound);
  return (label ? `<b class="tongue-label">${label}</b>` : '') + TONGUE_LEGEND_HTML;
}

export function tongueDiagramSVG(sound) {
  const s = SOUNDS[sound];
  if (!s) {
    return `${SVG_OPEN}<text x="60" y="55" text-anchor="middle" font-size="8" fill="var(--text-dim)">Sin diagrama</text><text x="60" y="68" text-anchor="middle" font-size="7" fill="var(--text-dim)">solo sibilantes</text><text x="60" y="80" text-anchor="middle" font-size="6" fill="var(--text-dim)">zh/ch/sh/z/c/s/j/q/x/r</text></svg>`;
  }
  const [cx, cy] = s.at;
  const mark = s.touch
    ? `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#F1E9DC" stroke="#17130F" stroke-width="0.8"/>`
    : `<circle cx="${cx}" cy="${cy}" r="3.6" fill="none" stroke="#F1E9DC" stroke-width="1.2"/>`;
  const voice = s.voiced
    ? '<path d="M98 106 l3 -4 l3 8 l3 -8 l3 8 l3 -4" fill="none" stroke="#5C8C77" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><text x="95" y="108" text-anchor="end" font-size="6" fill="#5C8C77">voz</text>'
    : '';
  return `${SVG_OPEN}
  <g transform="translate(8 0)">
    <path d="${LIP_UP}" fill="#8a7a65" opacity="0.55"/>
    <path d="${LIP_LOW}" fill="#8a7a65" opacity="0.55"/>
    <path d="${s.tongue}${FLOOR}" fill="#B4432E" stroke="#7a2e1e" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${PALATE}" fill="none" stroke="#CBA35C" stroke-width="3" stroke-linecap="round"/>
    <path d="${TEETH_UP}" fill="#F1E9DC" stroke="#5C8C77" stroke-width="1"/>
    <path d="${TEETH_LOW}" fill="#F1E9DC" stroke="#5C8C77" stroke-width="1"/>
    ${mark}
  </g>
  ${AIR[s.air]}
  ${voice}
</svg>`;
}
