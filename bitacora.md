# Bitácora del Proyecto Entrenador de Mandarín

## Versión actual: 1.0.7 (3 de octubre de 2026)

### Estado general

App web modular (ES modules, sin build) para practicar mandarín: diagnóstico, tonos, sibilantes, aspiración, grabadora, corrección por voz, escritura con repaso espaciado y progreso. Publicada en GitHub Pages (`/entrenador-mandarin/`).

- **Vocabulario:** 3.909 palabras HSK 1-5 (82% del estándar de 4.750; faltan 841) + 89 palabras de corrección.
- **Voz (TTS):** learning 0.55/0.8 · calm 0.60/0.9 · default 0.70/0.95 · fast 1.1/1.2 (velocidad/altura). Tonos usa learning con controles ajustables; corrección usa calm.
- **Diagramas de lengua:** 10 sonidos (zh/ch/sh/r/z/c/s/j/q/x) en corrección y grabadora.
- **Service Worker:** caché `v3`. **No se registra en GitHub Pages** (ver Pendiente), así que el modo offline hoy solo funciona en `localhost`.

> **Corrección de cifras (1.0.7):** las versiones 1.0.2 a 1.0.6 de esta bitácora decían "4.269 palabras (90%)". El total real de los JSON es 3.909 (395 + 261 + 568 + 1.040 + 1.645).

### Vocabulario por nivel

| Archivo | Palabras | Antes | Caracteres sueltos (tonos/escritura) |
|---|---|---|---|
| `data/hsk1.json` | 395 | 153 | 190 |
| `data/hsk2.json` | 261 | 148 | 93 |
| `data/hsk3.json` | 568 | 285 | 161 |
| `data/hsk4.json` | 1.040 | 27 | 230 |
| `data/hsk5.json` | 1.645 | 12 | 298 |
| **Total** | **3.909** | 625 | **972** (946 con tono 1-4) |

Formato de cada palabra: array `["han", "pin", "es"]`, con metadatos `version/updated/level` por archivo.

### Cronología

**30 de agosto de 2026 — Base del proyecto**
- Extracción de datos del HTML monolítico original a `data/*.json` con script Node.js (591 palabras HSK 1-3, 5 ítems de diagnóstico, 14 grupos de sibilantes, 5 pares de aspiración, 19 palabras de corrección).
- Estructura `css/`, `js/`, `data/`, `icons/` y separación en módulos: `storage`, `tts`, `data`, `diagnostico`, `tonos`, `sibilantes`, `aspiracion`, `grabadora`, `correccion`, `escritura`, `progreso`, `main`.
- Escritura con repetición espaciada Leitner por carácter: cajas 0-5, intervalos `[0, 1, 3, 7, 14, 30]` días, chips "por repasar hoy / en estudio / dominados", botón Repaso, HanziWriter con `showHintAfterMisses: 1` y caché de trazos en localStorage.
- PWA: `manifest.webmanifest` (íconos 192/512, maskable) y `sw.js` (cache-first para la app y CDN, stale-while-revalidate para `data/*.json`).
- `styles.css` con la paleta original (#17130F, #B4432E, #5C8C77, #CBA35C, #F1E9DC), `README.md` y `<base href>` para GitHub Pages.

**31 de agosto de 2026 — Vocabulario y voz**
- `0e70b2e`: expansión HSK 1-5 a 3.909 palabras, validadas 100% en formato array.
- `6ed17f8`: TTS con modo `learning` (0.5/0.8) y default 0.82 → 0.70/0.95.
- `fb9859c`: `calm` 0.75 → 0.60 y corrección pasa a usar `calm`.
- `6ddcc36`: tonos pasa a `learning`. El quiz usa solo caracteres sueltos a propósito (una palabra compuesta tiene varios tonos).
- `a5012d6`: `learning` 0.5 → 0.55.

**31 de agosto de 2026 — Escritura: animación en loop (`ed4fa64`)**
- Botón "Ver animación": clic 1 loop continuo, clic 2 detener. Dos intentos fallidos (`1ec958a`, `eb77b75`/`a0b1ed2`: `play()` no existe en HanziWriter 3.7) antes de la solución con `isLooping` + `animateCharacter({ onComplete })` + pausa de 800 ms.

**31 de agosto de 2026 — Corrección por voz**
- `e337000`: descripción del panel incluye `q`. `53bbcae`: `correccion.json` 19 → 89 palabras (zh8/sh11/ch9/z7/c9/s7/j10/q10/x9/r7), 2 confusiones por palabra.
- `17af870`, `4b8cc99`, `fecdf76`, `017cf78`: cuatro intentos de arreglar "Escuchando…" colgado en Android Chrome; no lo resolvieron.
- `1525d06` (activo): en móvil se graba 3,5 s con `MediaRecorder` y se transcribe con `Xenova/whisper-tiny` (transformers.js por CDN, ~40 MB la primera vez). En PC sigue `SpeechRecognition` nativo.

**31 de agosto de 2026 — Diagramas de lengua y grabadora**
- `8e3b63f`: `js/tongueDiagrams.js` con 10 SVG, integrado en corrección; `sw.js` v1 → v2.
- `fe6b1c3`, `516456f`: tamaño responsive, leyenda lateral, placeholder "Sin diagrama" para palabras no sibilantes.
- `3616978`: grabadora con filtro Todos/HSK 1-5/Sibilantes y diagrama por palabra.
- `4a3dcc7`, `752c6f7`, `43ca807`: ajustes por solapamiento del diagrama con el hanzi en grabadora. La causa real era que la caja medía 160×120 y el SVG 160×160; lo resolvió reducir el SVG, no los márgenes.

**3 de octubre de 2026 — Versión 1.0.7**
- **Diagramas redibujados:** corte lateral de la boca con labios, dientes, paladar y lengua completa. Cada sonido se distingue por forma de lengua, marca de contacto (● toca / ○ no toca) y tipo de aire (soplo fuerte, aire continuo, casi sin aire); `r` añade marca de voz. La descripción del sonido pasa del SVG a la leyenda, donde se lee en cualquier tamaño.
- **Layout de diagramas en CSS:** clases `.tongue-wrap`, `.tongue-dia`, `.tongue-legend` en `styles.css` reemplazan los estilos en línea duplicados y el `matchMedia` de `correccion.js` y `grabadora.js`. Corrección 160 px (120 en móvil), grabadora 120 px (90 en móvil), margen único de 22 px.
- **Tonos:** controles de velocidad (0.40-0.80) y altura de voz (0.60-1.20) en el panel, guardados en localStorage (`tone_voice_v1`). Valores iniciales 0.55/0.80. `speak()` acepta `rate` y `pitch` opcionales.
- **Escritura — loop atascado en los primeros trazos:** HanziWriter llama `onComplete` también cuando una animación se cancela. Al detener y reiniciar rápido (o cambiar de carácter y reiniciar), el callback de la animación cancelada programaba otro reinicio a los 800 ms, que cancelaba la animación en curso, y así indefinidamente. Arreglo en `loopAnimation()`: se ignoran los `onComplete` con `canceled` y los de un loop anterior (`loopGen`).
- **CSS:** definidas `--bg-soft` y `--gold-soft`, que se usaban sin existir (fondos transparentes en diagramas y aviso de IA).
- **Otros:** `sw.js` v2 → v3; texto del panel de tonos actualizado a HSK 1-5; `.gitignore` ignora `session-ses_*.md`.

### Bugs resueltos

| # | Síntoma | Causa | Arreglo |
|---|---|---|---|
| 1, 6 | `pin is undefined` / "no se pudo cargar la base de conocimientos" | Los JSON traen arrays `["han","pin","es"]` y el código esperaba objetos | Destructuring de array y `computeTone()` tolerante en `js/data.js` |
| 2 | Datos no cargan en GitHub Pages | `cache: 'no-cache'` en `data.js` chocaba con el Service Worker | Se movió a `staleWhileRevalidate()` en `sw.js` |
| 3 | `data.js` no exporta `loadKnowledgeBase` | Faltaba el export | `export { loadKnowledgeBase }` |
| 4 | 404 en datos HSK 4-5 | Faltaban en `APP_SHELL` | Añadidos a `sw.js` |
| 5 | Íconos y recursos 404 | `<base href="/chino/">` tras renombrar el repo | `<base href="/entrenador-mandarin/">` |
| 7 | `speak is not defined` | `tonos.js` no importaba `speak` | Import añadido |
| 8 | `groups[w.level] is undefined` en grabadora | Solo había grupos para niveles 1-3 | Añadidos niveles 4 y 5 |
| 9 | La animación no hacía loop | `play()` no existe en HanziWriter 3.7 | `isLooping` + `onComplete` (`ed4fa64`) |
| 10 | Loop repite solo los primeros trazos | `onComplete` de animaciones canceladas reiniciaba el loop | Filtro `canceled` + `loopGen` (1.0.7) |

### Pendiente

**Alta**
- **Service Worker no se registra en GitHub Pages:** `js/main.js` llama `register('/sw.js')`, que apunta a `gonzull.github.io/sw.js` (404). El archivo está en `/entrenador-mandarin/sw.js`. Arreglarlo activa el modo offline, pero como la app se sirve cache-first, habría que subir `CACHE_NAME` en cada cambio o pasar la app a stale-while-revalidate.
- Corrección en Android: el reconocimiento con Whisper funciona, con precisión variable.

**Media**
- Más pares de aspiración (hoy 5).
- Modo "examen" en escritura (ocultar el modelo).
- Añadir palabras desde la interfaz (hoy solo vía JSON).
- El texto "Nativo" se sale del botón circular en grabadora.

**Baja**
- Completar HSK 1-5 (faltan 841 palabras).
- Diagramas para sonidos no sibilantes (b/p/m/l, etc.).
- Notas fonéticas y contenido cultural.

### Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Interfaz y paneles |
| `css/styles.css` | Estilos, paleta, layout de diagramas y controles de voz |
| `sw.js`, `manifest.webmanifest` | Caché offline y PWA |
| `js/main.js` | Arranque, pestañas, registro del Service Worker |
| `js/data.js` | Carga de `data/*.json` y cálculo de tono |
| `js/storage.js` | localStorage con respaldo en memoria |
| `js/tts.js` | Síntesis de voz y modos de velocidad |
| `js/tongueDiagrams.js` | SVG de lengua y leyenda |
| `js/diagnostico.js`, `tonos.js`, `sibilantes.js`, `aspiracion.js`, `grabadora.js`, `correccion.js`, `escritura.js`, `progreso.js` | Un módulo por panel |
| `data/hsk1-5.json`, `diagnostico.json`, `sibilantes.json`, `aspiracion.json`, `correccion.json` | Base de conocimientos |
| `entrenador-mandarin (4).html` | HTML original, solo como referencia |

### Cómo ejecutar

Requiere un navegador actual (Chrome, Edge o Firefox) y un servidor local; los módulos ES no cargan desde `file://`. `index.html` usa `<base href="/entrenador-mandarin/">`, así que los recursos se piden bajo esa ruta. Dos formas de probar en local:

- Servir la carpeta **padre** con el proyecto en una carpeta llamada `entrenador-mandarin` y abrir `http://localhost:8080/entrenador-mandarin/`.
- O cambiar temporalmente a `<base href="/">` (está comentado en `index.html:7`), servir dentro de la carpeta del proyecto y abrir `http://localhost:8080`. No subir ese cambio.

```powershell
python -m http.server 8080
# o: npx http-server -p 8080
```

**GitHub Pages:** Settings → Pages → Source: `main` / root. Queda en `https://TU_USUARIO.github.io/entrenador-mandarin/`.

**Micrófono:** grabadora y corrección necesitan HTTPS o `localhost`.

---

*Bitácora actualizada el 3 de octubre de 2026 (1.0.7).*
