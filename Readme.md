# Entrenador de Mandarín

Aplicación web para hispanohablantes que estudian chino mandarín. Reúne en un solo lugar la práctica de pronunciación, tonos, escritura de caracteres y armado de oraciones, con vocabulario de HSK 1 a 6.

Funciona en el navegador, sin instalación ni cuenta. El progreso se guarda solo en el dispositivo.

**Sitio publicado:** https://gonzull.github.io/entrenador-mandarin/

## Qué incluye

| Pestaña | Para qué sirve |
|---|---|
| **Tonos** | Escuchas un carácter y eliges su tono (1 a 4). Usa unos 2.340 caracteres del vocabulario, con filtro por nivel HSK y por lección del libro, y controles para ajustar la velocidad y la altura de la voz. |
| **Sibilantes** | Distinguir de oído los tres grupos que más se confunden: zh/ch/sh, z/c/s y j/q/x. Los tríos se arman con caracteres del vocabulario que solo se diferencian en la inicial. |
| **Aspiración** | Pares de caracteres del vocabulario que solo se diferencian en el soplo de aire (b/p, d/t, g/k, j/q, zh/ch, z/c), para escuchar y comparar. |
| **Grabadora** | Escuchas la palabra, te grabas y comparas ambos audios. Tiene un buscador por hanzi, pinyin o significado para encontrar una palabra y oír cómo se lee. Muestra un diagrama de la posición de la lengua para los sonidos sibilantes. |
| **Escritura** | Orden de trazos animado y práctica de escritura con corrección trazo a trazo, cuadrícula guía (米字格 / 田字格), filtro por nivel y lección, buscador de caracteres y repaso espaciado. |
| **Oraciones** | Armar oraciones ordenando fichas de palabras, y diálogos por lección donde completas las líneas de tu personaje. |
| **Chengyu** | Fichas de expresiones de cuatro caracteres (成语): sentido literal, significado real, uso, origen cuando se conoce y un ejemplo. Incluye un quiz de significados y filtro por lección. |
| **Flashcards** | Tarjetas de vocabulario que se voltean (chino, chino con pinyin o español al frente) con repaso espaciado, y un juego de cuatro opciones con puntos, racha y récord. Filtro por nivel y lección. |
| **Progreso** | Racha de días, sesiones, caracteres y palabras practicados y dominados, repasos pendientes y récord del juego. |

## Contenido

- **Vocabulario:** 5.722 palabras de HSK 1 a 6, con pinyin y traducción al español. Las palabras de HSK 1 a 3 que pertenecen al programa nuevo de HSK y no a los libros usados aquí aparecen como "Repaso extra" de su nivel.
- **Caracteres para escritura:** el buscador cubre todos los caracteres que aparecen en ese vocabulario, también los que solo existen dentro de palabras compuestas.
- **Oraciones y diálogos:** 428 oraciones y 177 diálogos de HSK 1 a 6, todos asociados a una lección. Los grupos "HSK 1 v3.0" a "HSK 3 v3.0" traen 19 diálogos sobre temas de los libros *New HSK Course* (programa nuevo) que los demás no cubren. En HSK 6, 82 oraciones ejercitan los puntos de gramática del libro y lo indican al resolverlas.
- **Chengyu:** 113 fichas, una por cada expresión de cuatro caracteres del vocabulario de HSK 6.
- **Orden por lecciones:** el vocabulario y los diálogos siguen el orden de lecciones de los libros *HSK Standard Course* 1 a 6 (los niveles 4, 5 y 6 tienen tomos A y B). Los libros no forman parte de este repositorio; las oraciones y diálogos son texto propio escrito con el vocabulario y la gramática de cada lección.

## Limitaciones conocidas

- **Las oraciones, los diálogos y las traducciones fueron redactados con ayuda de IA** y no han sido revisados por un hablante nativo. Pueden contener errores.
- **HSK 5 y 6:** los diálogos son más breves que los de otros niveles (4 líneas por lección).
- **La voz es la síntesis del dispositivo**, no una grabación de un hablante nativo. La calidad depende de las voces chinas instaladas en el sistema.
- **Diagramas de lengua:** solo para los diez sonidos sibilantes. Son esquemas orientativos.

## Uso en el celular

1. Abre https://gonzull.github.io/entrenador-mandarin/ en Chrome.
2. La primera vez que uses la Grabadora, el navegador pedirá permiso para el micrófono.
3. Opcional: menú ⋮ → "Instalar app" (o "Añadir a pantalla principal") para tenerla como aplicación.

### Sin conexión

Tras la primera visita con internet, la app queda guardada en el navegador y abre sin conexión. Cuando hay internet, siempre carga la versión más reciente.

Una cosa sigue necesitando internet la primera vez que se usa:

- **Trazos de cada carácter** (Escritura): se descargan al ver el carácter por primera vez y luego quedan guardados.

## Uso en computador (para desarrollo)

La app son archivos estáticos, pero debe abrirse desde un servidor local: los navegadores bloquean la carga de módulos y datos al abrir `index.html` con doble clic.

`index.html` declara `<base href="/entrenador-mandarin/">`, así que el servidor debe exponer el proyecto bajo esa ruta. Lo más simple es levantarlo en la carpeta **que contiene** al proyecto:

```powershell
git clone https://github.com/Gonzull/entrenador-mandarin.git
python -m http.server 8080
```

Y abrir `http://localhost:8080/entrenador-mandarin/`.

También sirve `npx http-server -p 8080` en lugar de Python. El micrófono solo funciona en `localhost` o en sitios HTTPS.

## Estructura del proyecto

```
entrenador-mandarin/
├── index.html              Interfaz y paneles
├── manifest.webmanifest    Configuración de la app instalable
├── sw.js                   Service Worker (uso sin conexión)
├── css/styles.css          Estilos
├── js/
│   ├── main.js             Arranque, pestañas, registro del Service Worker
│   ├── data.js             Carga de data/*.json
│   ├── chars.js            Índice de caracteres del vocabulario (sílaba, tono, lecturas)
│   ├── lessonFilter.js     Selector de lección para Tonos y Escritura
│   ├── storage.js          Guardado en el navegador (localStorage)
│   ├── tts.js              Síntesis de voz y velocidades
│   ├── tongueDiagrams.js   Diagramas de posición de la lengua
│   ├── tonos.js            Pestaña Tonos
│   ├── sibilantes.js       Pestaña Sibilantes
│   ├── aspiracion.js       Pestaña Aspiración
│   ├── grabadora.js        Pestaña Grabadora
│   ├── correccion.js       Pestaña Corrección (oculta por ahora)
│   ├── pinyinMatch.js      Comparación por pinyin y diagnóstico de Corrección
│   ├── escritura.js        Pestaña Escritura
│   ├── oraciones.js        Pestaña Oraciones
│   ├── chengyu.js          Pestaña Chengyu
│   ├── flashcards.js       Pestaña Flashcards
│   ├── progreso.js         Pestaña Progreso
│   └── diagnostico.js      Diagnóstico inicial (pestaña oculta)
├── icons/                  Íconos de la app (192, 512, maskable y Apple)
└── data/
    ├── hsk1.json … hsk6.json   Vocabulario: 242 / 249 / 477 / 999 / 1.820 / 1.925 palabras
    ├── oraciones.json          Oraciones y diálogos (todos con su lección)
    ├── chengyu.json            Fichas de chengyu
    ├── oraciones_archivo.json  Oraciones antiguas sin lección; la app no lo carga
    ├── sibilantes.json         14 grupos de sonidos
    ├── aspiracion.json         5 pares
    ├── correccion.json         89 palabras seleccionadas para Corrección
    └── diagnostico.json        5 frases de diagnóstico
```

### Formato de los datos

- **Vocabulario:** cada palabra es `["汉字", "pinyin", "español"]`. Un cuarto elemento opcional indica la lección del libro del mismo nivel: `["你", "nǐ", "tú", 1]`.
- **Oraciones:** `zh` y `pin` van separados por espacios, una ficha por palabra y en el mismo orden; `end` es la puntuación final; `es` la traducción.

Para ampliar el contenido basta editar estos JSON y actualizar su campo `"updated"`.

## Tecnología

HTML, CSS y JavaScript sin compilación ni dependencias de instalación. Usa [HanziWriter](https://hanziwriter.org/) para los trazos y, en celular, [transformers.js](https://huggingface.co/docs/transformers.js) con Whisper para el reconocimiento de voz; ambos se cargan desde CDN.
