# Peldaño

Una escalera que conecta dos palabras. Juego de palabras diario en español: se baja de una palabra a otra de la misma longitud (4 o 5 letras) cambiando **una sola letra en cada peldaño**, y cada peldaño tiene que ser una palabra válida.

*De la risa a la pena:* risa → pisa → pesa → pena (2 peldaños: pisa y pesa).

## Reglas

- Solo se cambia una letra por paso, en la misma posición: no se añaden, quitan ni reordenan letras.
- Las tildes no cuentan (pésa = pesa). La **ñ** es una letra propia.
- No se puede repetir una palabra dentro de la misma escalera.
- Valen las palabras de la lista `palabras` del diccionario (`data/diccionario.json`).
- Los **peldaños** son las palabras intermedias: ni la de salida ni la de llegada cuentan. El **par** es el número mínimo de peldaños usando solo palabras corrientes (viene calculado en `data/retos.json`, y es la longitud de `sol` menos 2).
- Puntuación tipo golf: peldaños + pistas, frente al par. Menos: «¡Bajo par!» (posible con atajos de palabras raras); igual: «En par»; más: «+1», «+2»…
- **Tres escaleras al día**, una por nivel: Principiante (par 2–3), Intermedio (par 4) y Experto (par 5 o más). Se elige con el selector de arriba; al terminar una, se ofrece la siguiente. El día está **completado** cuando se terminan las tres (llegando o rindiéndose).
- El **nº 1 es el 15 de octubre de 2026** (constante `LANZAMIENTO` en `js/juego.js`). El reto *n* de cada nivel es el del día *n*; si hay menos retos que días, se vuelve a empezar por el primero.
- Hay **retos hasta el 31 de diciembre de 2026** (día nº 78). Si no se añaden más, el 1 de enero de 2027 se volvería a empezar por el nº 1.
- Algunos días de diciembre tienen retos con tema: Lotería (22 dic, «Del gordo al pobre» y «Del bombo al Gordo»), Nochebuena (24 dic, «De la cena a la misa»), Navidad (25 dic, «Del pino al reno» y «Del belén a los magos»), Reyes (27 dic, «De la carta a los magos»; 30 dic, «De los magos a los pajes») y Nochevieja (31 dic, «Del vino al cava» y «De la nueva a la vieja»).

## Cómo se juega en pantalla

- La escalera: la palabra de salida arriba (rellena), los peldaños debajo y la de llegada abajo, con contorno discontinuo hasta alcanzarla. Las letras que ya coinciden con la de llegada en su posición van en verde. Con muchas filas (desde la sexta), las casillas y los huecos entre filas encogen poco a poco, sin bajar de 36 px.
- Tras subir un peldaño, pedir una pista, deshacer o cambiar de nivel, la página se desplaza lo justo para que el borrador y la palabra de llegada queden por encima del mando de abajo (si no caben los dos, el borrador). Mientras se escribe no se mueve, por si se ha subido a mirar la escalera.
- Debajo de la última palabra está la fila de **borrador**, donde se escribe la palabra nueva entera: se toca una casilla (o se elige con las flechas) y se escribe en ella, y el cursor pasa a la de su derecha; **Borrar** vacía la casilla elegida (o, si ya está vacía, la de su izquierda). Las letras que ya coinciden con la de llegada salen en verde y la que cambia respecto a la anterior, resaltada. **✓** (Subir; activo con la fila completa) comprueba que cambia exactamente una letra, que está en el diccionario y que no se repite, y fija el peldaño. Si la palabra subida está a una letra de la de llegada, la palabra de llegada se pone sola (y no cuenta como peldaño) y la partida termina.
- Teclado en pantalla con ñ (QWERTYUIOP / ASDFGHJKLÑ / ZXCVBNM), con **✓** (Subir) a la izquierda de la última fila y **Borrar** a la derecha. Con teclado físico: letras (las vocales con tilde valen como sin ella), Intro para subir, Retroceso para borrar y flechas para elegir casilla.
- Errores en la propia página, sin alertas: «PESU» no está en el diccionario; «PESA» ya está en tu escalera.
- **Deshacer** vacía el borrador si hay algo escrito; si no, quita el último peldaño. No penaliza.
- **Pista** suma 1 al marcador: busca el camino más corto (búsqueda en anchura) desde la palabra actual hasta la de llegada por palabras `corrientes` sin repetir las de la escalera; si no lo hay, por cualquier palabra válida; si tampoco, sugiere deshacer. El siguiente peldaño queda como borrador. Si ya está en el borrador, no se vuelve a cobrar. Pide confirmación en el propio botón («Confirmar», 5 segundos, con el aviso «La pista suma 1 a tu marcador. ¿La quieres?»).
- **Rendirse** pide confirmación en el propio botón («Confirmar», 5 segundos) y enseña la ruta del par.
- Mientras Pista o Rendirse esperan «Confirmar», escribir, borrar, elegir otra casilla, subir o deshacer cancela la confirmación.
- Arriba: nombre, calendario, racha y ayuda; el selector de nivel (con el par o el resultado de cada uno); el número del día y el título del reto; y el marcador (par, peldaños y pistas, en rojo si ya se pasa del par).
- Al llegar, el veredicto sale en el panel de abajo (y, si con ese nivel se completa el día, el aviso «¡Día completado!»).
- **Resultado** (con «Ver resultado» al llegar; al rendirse se abre solo, para enseñar la solución): veredicto («¡Bajo par!», «En par», «+n sobre el par» o «Te has rendido»), las cifras (al rendirse, «Tras 2 peldaños + 1 pista · par 4», o «Sin peldaños · par 4» si no se subió ninguno), tu escalera, la ruta del par (`sol`; si tu escalera es esa misma, una sola fila: «Tu escalera: ¡la ruta del par!»), el mínimo absoluto si es menor que el par (`min`), la **Nota curiosa** (`note`) y el texto para compartir con **Copiar resultado**:

  ```
  Peldaño #3 · Intermedio
  De la reja al muro
  🪜 5 peldaños (par 4) · +1
  emiliocasanovabiscarri.github.io/Peldano
  ```

  Con pistas, «🪜 4 peldaños + 1 pista (par 4) · +1»; al rendirse, «🏳️ Me he rendido (par 4)».
- **Volver a jugar** repite la misma escalera desde cero. El resultado que cuenta (estadísticas, selector, compartir) es siempre el primero; el de la repetición se ve aparte en la ventana de resultado.
- **Siguiente nivel**: el siguiente sin terminar de ese día.

## Días pasados, racha y estadísticas

- **Calendario** (botón del calendario): se juegan los días anteriores; no se puede adelantar a días futuros. Los días con algún nivel empezado llevan un punto; los que tienen los tres niveles terminados, relleno verde. Mientras se juega un día pasado, una franja lo indica, con «Volver a hoy».
- **Racha** (llama en la barra de arriba): días seguidos en que se **llega** al final de al menos uno de los tres niveles del día, ese mismo día. Rendirse no cuenta, y como cuenta el primer resultado, tampoco repetir y llegar en un nivel en el que te rendiste. Jugar el archivo no cuenta. Si hoy aún no se ha llegado en ninguno pero ayer sí, la racha sigue viva (borde discontinuo) hasta medianoche. Al tocarla se ve también la mejor racha.
- **Estadísticas** (segunda pestaña del calendario): días completados, racha actual y mejor racha; y por nivel, partidas, veces en par o bajo par (con porcentaje) y una barra con el reparto bajo par / en par / sobre el par / rendido.
- Se abre siempre en **modo claro**. El **modo noche** se activa con el interruptor al final de la ventana «?», se recuerda en el navegador y se aplica antes de pintar la página (script en el `<head>`).
- La partida de cada día y nivel, la racha y las estadísticas se guardan en el dispositivo (`localStorage`, clave `peldano-v1`), así que se puede cerrar y volver sin perder nada. Si el juego está abierto en varios sitios a la vez, al guardar se une lo de cada uno (de cada partida, la más reciente, conservando el primer resultado) y cada pestaña se pone al día cuando otra guarda (evento `storage`). Hasta `peldano-v8` rendirse también mantenía la racha: al cargar se quitan una vez (marca `soloLlegadas`) los días sin ningún nivel llegado. Si se cambia `LANZAMIENTO`, el progreso guardado se corre solo para que cada partida siga en su fecha.
- Es una PWA: se puede instalar en el móvil y funciona sin conexión. Tras el tercer día jugado, el juego invita una sola vez a instalarlo (en iPhone/iPad con los dos pasos de Safari; en Android/Chrome con un botón «Instalar»). Nunca sale si ya se juega desde la app instalada.
- Respeta `prefers-reduced-motion` (sin animaciones) y todos los controles tienen foco visible.

## Estructura

```
index.html              página del juego
reiniciar/index.html    borra el progreso guardado en el dispositivo (/reiniciar)
css/estilo.css          estilos (modo claro y oscuro; paleta del logo: verde salvia #7DB48C, azul marino #1E2A3A, crema #F6F1E7)
js/juego.js             lógica del juego: reglas, búsqueda de caminos, partidas, calendario, estadísticas y compartir
data/retos.json         retos por nivel: a, b, t (título), par, sol (ruta del par), min, note
data/diccionario.json   palabras (todas las válidas) y corrientes (las del par y las pistas)
manifest.webmanifest    datos de la app instalable
sw.js                   service worker (funcionamiento sin conexión)
icons/                  logo (escalera de mano inclinada con el peldaño central en crema) e iconos de la app (favicon.svg es el original); og.png es la vista previa al compartir el enlace, generada desde og-fuente.html
fonts/                  Bricolage Grotesque y Atkinson Hyperlegible, alojadas aquí para ir sin conexión
```

## Probarlo en local

El juego carga `data/retos.json` y `data/diccionario.json` con `fetch`, así que hay que servirlo por HTTP (abrir `index.html` con doble clic no funciona):

```sh
python3 -m http.server 8000
```

y abrir <http://localhost:8000>.

Para empezar de cero, abre <http://localhost:8000/reiniciar> y confirma con «Sí, borrar todo». Borra las partidas, la racha y los ajustes de este navegador, además de la copia sin conexión del service worker, y vuelve al juego.

## Añadir retos

`data/retos.json` tiene tres listas (`principiante`, `intermedio`, `experto`) con **la misma cantidad de retos**; el reto *n* de cada una es el del día *n*. Para añadir días, añade un reto al final de cada lista. **Después**, sube `VERSION` en `sw.js` (por ejemplo, `peldano-v2`) para que los móviles con la app instalada reciban los cambios. Lo mismo al cambiar cualquier otro archivo del juego.

## Publicación en GitHub Pages

El juego es estático y usa rutas relativas, así que funciona tal cual en `https://emiliocasanovabiscarri.github.io/Peldano/`:

1. En GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch*.
2. Rama `main`, carpeta `/ (root)`, *Save*.
3. A los pocos minutos estará en <https://emiliocasanovabiscarri.github.io/Peldano/>.

Para instalarlo en el móvil: abrir la dirección y, en Android (Chrome), *Instalar aplicación*; en iPhone (Safari), *Compartir → Añadir a pantalla de inicio*. La instalación y el modo sin conexión necesitan HTTPS, que GitHub Pages ya da.

**El `id` de `manifest.webmanifest` es `"/Peldano/app"` y no se debe volver a cambiar.** Chrome identifica la app instalada por él: si cambia, los móviles la toman por otra app. Además, el `id` no se resuelve respecto a la carpeta del juego, sino respecto al origen de `start_url` (`https://emiliocasanovabiscarri.github.io`). Por eso no vale `"./"` ni `"/"`: los dos dan la raíz del sitio, la misma que Almanaque, y Chrome confundiría las dos apps («ya está instalado», «No se puede abrir la app»).

Historia del `id`: hasta el 16 de octubre de 2026 no se fijaba y Chrome calculaba `/Peldano/`. Del 16 al 17 fue `"./"`, que chocaba con Almanaque. El 17 pasó a `"/Peldano/"`. El 18 pasó a `"/Peldano/app"`, porque una tablet Android seguía diciendo «ya está instalada» con `"/Peldano/"` sin tener ninguna app de Peldaño en `chrome://webapks`. Quien instaló Peldaño con un `id` anterior conserva su app, pero Chrome puede ofrecerle instalarla de nuevo como otra distinta.

Si cambia la dirección, actualiza `URL_JUEGO` en `js/juego.js` (de ella sale el enlace del texto de compartir, sin `https://`) y las etiquetas `og:` de `index.html`.

## Derechos de autor

© 2026 Emilio Casanova Biscarri. Todos los derechos reservados. El código, los textos y los diseños de este repositorio no pueden copiarse ni reutilizarse sin permiso. Consulta el archivo [LICENSE](LICENSE).
