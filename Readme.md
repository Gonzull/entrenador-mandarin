# Entrenador de Mandarín

Aplicación web para hispanohablantes que estudian chino mandarín. Reúne en un solo lugar la práctica de pronunciación, tonos, escritura de caracteres y armado de oraciones, con vocabulario de HSK 1 a 5.

Funciona en el navegador, sin instalación ni cuenta. El progreso se guarda solo en el dispositivo.

**Sitio publicado:** https://gonzull.github.io/entrenador-mandarin/

## Qué incluye

| Pestaña | Para qué sirve |
|---|---|
| **Tonos** | Escuchas un carácter y eliges su tono (1 a 4). Filtro por nivel HSK y controles para ajustar la velocidad y la altura de la voz. |
| **Sibilantes** | Distinguir de oído los tres grupos que más se confunden: zh/ch/sh/r, z/c/s y j/q/x. |
| **Aspiración** | Pares de sonidos con y sin soplo de aire (b/p, d/t, g/k…), para comparar. |
| **Grabadora** | Escuchas la palabra, te grabas y comparas ambos audios. Muestra un diagrama de la posición de la lengua para los sonidos sibilantes. |
| **Corrección** | Dices una palabra en voz alta y el reconocimiento de voz indica si sonó como otro sonido del grupo zh/ch/sh/z/c/s/j/q/x/r. |
| **Escritura** | Orden de trazos animado y práctica de escritura con corrección trazo a trazo, cuadrícula guía (米字格 / 田字格), buscador de caracteres y repaso espaciado. |
| **Oraciones** | Armar oraciones ordenando fichas de palabras, y diálogos por lección donde completas las líneas de tu personaje. |
| **Progreso** | Racha de días, sesiones y caracteres practicados y dominados. |

## Contenido

- **Vocabulario:** 3.599 palabras de HSK 1 a 5, con pinyin y traducción al español.
- **Caracteres para escritura:** el buscador cubre todos los caracteres que aparecen en ese vocabulario, también los que solo existen dentro de palabras compuestas.
- **Oraciones y diálogos:** 203 oraciones y 49 diálogos de HSK 1 a 3, todos asociados a una lección.
- **Orden por lecciones:** el vocabulario y los diálogos de HSK 1, 2 y 3 siguen el orden de lecciones de los libros *HSK Standard Course* 1, 2 y 3. Los libros no forman parte de este repositorio; las oraciones y diálogos son texto propio escrito con el vocabulario y la gramática de cada lección.

## Limitaciones conocidas

- **Las oraciones, los diálogos y las traducciones fueron redactados con ayuda de IA** y no han sido revisados por un hablante nativo. Pueden contener errores.
- **HSK 4 y 5** tienen solo vocabulario; todavía no hay oraciones ni orden por lecciones.
- **La voz es la síntesis del dispositivo**, no una grabación de un hablante nativo. La calidad depende de las voces chinas instaladas en el sistema.
- **Corrección por voz:** en computador usa el reconocimiento del navegador y funciona mejor en Chrome o Edge, con conexión a internet. En celular descarga una vez un modelo de unos 40 MB; su precisión es variable.
- **Diagramas de lengua:** solo para los diez sonidos sibilantes. Son esquemas orientativos.
- **Íconos de la app:** todavía no están incluidos, por lo que la instalación como app en Android puede no ofrecerse o mostrar un ícono genérico.

## Uso en el celular

1. Abre https://gonzull.github.io/entrenador-mandarin/ en Chrome.
2. La primera vez que uses la Grabadora o Corrección, el navegador pedirá permiso para el micrófono.
3. Opcional: menú ⋮ → "Añadir a pantalla principal" para tener un acceso directo.

### Sin conexión

Tras la primera visita con internet, la app queda guardada en el navegador y abre sin conexión. Cuando hay internet, descarga por detrás la versión más reciente, que se ve al abrir la app la vez siguiente.

Algunas cosas siguen necesitando internet la primera vez que se usan:

- **Trazos de cada carácter** (Escritura): se descargan al ver el carácter por primera vez y luego quedan guardados.
- **Reconocimiento de voz** (Corrección): en computador siempre requiere conexión; en celular solo para la descarga inicial del modelo.

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
│   ├── storage.js          Guardado en el navegador (localStorage)
│   ├── tts.js              Síntesis de voz y velocidades
│   ├── tongueDiagrams.js   Diagramas de posición de la lengua
│   ├── tonos.js            Pestaña Tonos
│   ├── sibilantes.js       Pestaña Sibilantes
│   ├── aspiracion.js       Pestaña Aspiración
│   ├── grabadora.js        Pestaña Grabadora
│   ├── correccion.js       Pestaña Corrección
│   ├── escritura.js        Pestaña Escritura
│   ├── oraciones.js        Pestaña Oraciones
│   ├── progreso.js         Pestaña Progreso
│   └── diagnostico.js      Diagnóstico inicial (pestaña oculta)
└── data/
    ├── hsk1.json … hsk5.json   Vocabulario: 245 / 261 / 528 / 989 / 1.576 palabras
    ├── oraciones.json          Oraciones y diálogos (todos con su lección)
    ├── oraciones_archivo.json  Oraciones antiguas sin lección; la app no lo carga
    ├── sibilantes.json         14 grupos de sonidos
    ├── aspiracion.json         5 pares
    ├── correccion.json         89 palabras con sus confusiones típicas
    └── diagnostico.json        5 frases de diagnóstico
```

### Formato de los datos

- **Vocabulario:** cada palabra es `["汉字", "pinyin", "español"]`. Un cuarto elemento opcional indica la lección del libro del mismo nivel: `["你", "nǐ", "tú", 1]`.
- **Oraciones:** `zh` y `pin` van separados por espacios, una ficha por palabra y en el mismo orden; `end` es la puntuación final; `es` la traducción.

Para ampliar el contenido basta editar estos JSON y actualizar su campo `"updated"`.

## Tecnología

HTML, CSS y JavaScript sin compilación ni dependencias de instalación. Usa [HanziWriter](https://hanziwriter.org/) para los trazos y, en celular, [transformers.js](https://huggingface.co/docs/transformers.js) con Whisper para el reconocimiento de voz; ambos se cargan desde CDN.
