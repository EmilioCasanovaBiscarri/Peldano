'use strict';
// Peldaño: tres escaleras por día (Principiante, Intermedio y Experto). El reto n de cada nivel es el del día n;
// si hay menos retos que días, se vuelve a empezar por el primero.

// Fecha de lanzamiento (año-mes-día, hora local): ese día es el nº 1. Si se cambia, el progreso guardado se corre solo.
const LANZAMIENTO = '2026-10-15';
const fechaUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m-1, d); };
const START = fechaUTC(LANZAMIENTO);
const URL_JUEGO = 'https://peldanio.github.io/';
const URL_COMPARTIR = URL_JUEGO.replace(/^https?:\/\//, '').replace(/\/$/, '');   // en el texto de compartir, sin https:// ni barra final
const STORE = 'peldano-v1';
const NIVELES = ['principiante', 'intermedio', 'experto'];
const NOMBRE = {principiante:'Principiante', intermedio:'Intermedio', experto:'Experto'};
const LETRAS = 'abcdefghijklmnñopqrstuvwxyz';
const TECLAS = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];
const $ = id => document.getElementById(id);
const pl = (n, uno, varios) => n+' '+(n===1 ? uno : varios);
// sin tildes ni diéresis (pésa = pesa); la ñ se queda, que es una letra propia
const norm = s => s.normalize('NFD').replace(/[̀́̈]/g,'').normalize('NFC').toLowerCase();

let RETOS = null, PALABRAS = new Set(), CORRIENTES = new Set();
// partidas[día][nivel] = {pasos, pistas, fin, res, rep, t}:
//   pasos: palabras de la escalera tras la de salida; pistas: pistas pedidas; fin: null, 'llegado' o 'rendido';
//   res: el primer resultado, que es el que cuenta (n peldaños, p pistas, r rendido, e la escalera); no cambia al repetir;
//   los peldaños son las palabras intermedias: la de llegada no cuenta (ver peldanos).
//   rep: true si se está repitiendo; t: hora del último cambio (para unir lo de varias pestañas).
// racha[día] = 1 si ese día se llegó al final de al menos un nivel en su fecha (rendirse no cuenta).
let S = {dia:1, nivel:'principiante', partidas:{}, racha:{}};
// lo que se está escribiendo en el borrador (no se guarda): una letra por casilla ('' si está vacía) y la casilla elegida
let escrito = [], pos = 0;
const vaciar = () => { escrito = []; pos = 0; };

// ---------- guardar sin pisar a otras pestañas ----------
// Hasta peldano-v5 la palabra de llegada contaba como peldaño: a lo guardado así se le resta (una sola vez)
function sinLlegada(s){
  if(!s || s.sinLlegada) return false;
  Object.values(s.partidas||{}).forEach(niv=>Object.values(niv).forEach(p=>{ if(p.res && !p.res.r && p.res.n > 0) p.res.n--; }));
  return s.sinLlegada = true;
}
// Hasta peldano-v8 rendirse también mantenía la racha: se quitan (una sola vez) los días en que ningún nivel
// tiene un primer resultado llegando
function soloLlegadas(s){
  if(!s || s.soloLlegadas) return false;
  Object.keys(s.racha||{}).forEach(d=>{ if(!Object.values((s.partidas||{})[d]||{}).some(p=>p.res && !p.res.r)) delete s.racha[d]; });
  return s.soloLlegadas = true;
}
function load(){ try{ const s = JSON.parse(localStorage.getItem(STORE)||'null'); if(!s) return;
  const viejo = sinLlegada(s) | soloLlegadas(s);
  S.partidas = s.partidas||{}; S.racha = s.racha||{};
  if(viejo) save(true);
  // guardado con otra fecha de lanzamiento: cada día se corre para que siga cayendo en su fecha
  if(s.inicio && s.inicio !== LANZAMIENTO){
    const k = Math.round((fechaUTC(s.inicio) - START)/864e5), correr = o => Object.fromEntries(Object.entries(o).map(([d,v])=>[+d+k, v]).filter(([d])=>d >= 1));
    S.partidas = correr(S.partidas); S.racha = correr(S.racha); save(true);
  } }catch(e){} }
// Si el juego está abierto en dos sitios, al guardar se une lo propio con lo ya guardado: de cada partida, la más
// reciente (conservando el primer resultado, que es el que cuenta), y los días de racha si cualquiera los tiene.
function fusionar(otro){
  if(!otro || otro.inicio !== LANZAMIENTO) return false;
  sinLlegada(otro); soloLlegadas(otro);
  let cambio = false;
  Object.entries(otro.partidas||{}).forEach(([d, niv])=>Object.entries(niv).forEach(([n, p])=>{
    const mias = S.partidas[d] || (S.partidas[d] = {}), mia = mias[n];
    if(!mia || (p.t||0) > (mia.t||0)){ mias[n] = Object.assign({}, p, {res: (mia && mia.res) || p.res}); cambio = true; }
    else if(!mia.res && p.res){ mia.res = p.res; cambio = true; }
  }));
  Object.entries(otro.racha||{}).forEach(([d,v])=>{ if(v && !S.racha[d]){ S.racha[d] = v; cambio = true; } });
  return cambio;
}
function save(sobrescribir){ try{
  if(!sobrescribir) fusionar(JSON.parse(localStorage.getItem(STORE)||'null'));
  localStorage.setItem(STORE, JSON.stringify({inicio:LANZAMIENTO, sinLlegada:true, soloLlegadas:true, partidas:S.partidas, racha:S.racha})); }catch(e){} }
// cuando otra pestaña guarda, esta se pone al día; si otra borra el progreso (/reiniciar), esta también se vacía
window.addEventListener('storage', e=>{
  if(e.key !== STORE && e.key !== null) return;
  if(e.newValue === null){ S.partidas = {}; S.racha = {}; }
  else { let otro = null; try{ otro = JSON.parse(e.newValue); }catch(err){} if(!fusionar(otro)) return; }
  if(!RETOS) return;
  vaciar();   // la escalera puede haber cambiado debajo del borrador
  renderTodo();
});

// ---------- días ----------
// número de día según la fecha local (el día del lanzamiento es el 1)
function today(){ const d = new Date(); return Math.max(1, Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - START)/864e5) + 1); }
function dateOf(day){ const d = new Date(START + (day-1)*864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
const fechaLarga = d => dateOf(d).toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
const reto = (d = S.dia, n = S.nivel) => { const l = RETOS[n]; return l[(d-1) % l.length]; };
// la partida sin crearla (para leer) y creándola (para cambiarla)
const ver = (d = S.dia, n = S.nivel) => (S.partidas[d] || {})[n];
function partida(d = S.dia, n = S.nivel){ const p = S.partidas[d] || (S.partidas[d] = {}); return p[n] || (p[n] = {pasos:[], pistas:0, fin:null, t:0}); }
const tocar = p => { p.t = Date.now(); };
const escalera = () => [reto().a, ...((ver()||{}).pasos || [])];
const actual = () => { const e = escalera(); return e[e.length-1]; };
const lleno = () => actual().split('').every((c, i)=>escrito[i]);
const cambios = (w, v) => [...w].filter((c, i)=>c !== v[i]).length;
const esValida = w => PALABRAS.has(w) || w === reto().b;
const empezada = p => !!p && (p.pasos.length > 0 || p.pistas > 0 || !!p.res);
const diaCompleto = d => NIVELES.every(n=>{ const p = ver(d, n); return p && p.res; });

// ---------- puntuación (golf: peldaños + pistas, frente al par) ----------
function veredicto(r, par){
  if(r.r) return {cls:'rendido', largo:'Te has rendido', corto:'Rendido', compartir:''};
  const k = r.n + r.p - par;
  if(k < 0) return {cls:'bajo', largo:'¡Bajo par!', corto:'Bajo par', compartir:'¡Bajo par!'};
  if(k === 0) return {cls:'par', largo:'En par', corto:'En par', compartir:'En par'};
  return {cls:'sobre', largo:'+'+k+' sobre el par', corto:'+'+k, compartir:'+'+k};
}
// peldaños de una partida: las palabras intermedias (la de llegada, que se pone sola, no cuenta)
const peldanos = p => p.pasos.length - (p.fin === 'llegado' ? 1 : 0);
const cuenta = r => pl(r.n, 'peldaño', 'peldaños') + (r.p ? ' + '+pl(r.p, 'pista', 'pistas') : '');
// al rendirse: «Tras 2 peldaños + 1 pista», o sin ninguno, «Sin peldaños» (y «· 1 pista» si las hubo)
const tras = r => r.n ? 'Tras '+cuenta(r) : 'Sin peldaños' + (r.p ? ' · '+pl(r.p, 'pista', 'pistas') : '');

// ---------- caminos: búsqueda en anchura cambiando una letra cada vez ----------
function* vecinos(w){ for(let i = 0; i < w.length; i++) for(const c of LETRAS) if(c !== w[i]) yield w.slice(0, i) + c + w.slice(i+1); }
// el camino más corto de «desde» a «hasta» por palabras que cumplan vale(w), o null si no lo hay
function camino(desde, hasta, vale){
  const previo = new Map([[desde, null]]), cola = [desde];
  for(let k = 0; k < cola.length; k++){
    const w = cola[k];
    if(w === hasta){ const r = []; for(let x = w; x !== null; x = previo.get(x)) r.unshift(x); return r; }
    for(const v of vecinos(w)) if(!previo.has(v) && (v === hasta || vale(v))){ previo.set(v, w); cola.push(v); }
  }
  return null;
}

// ---------- racha: días seguidos llegando al final de al menos un nivel en su fecha (rendirse no cuenta) ----------
// Sigue viva si hoy aún no has llegado en ninguno pero ayer sí; se rompe al saltarte un día entero.
function rachaHasta(d){ let n = 0; while(d >= 1 && S.racha[d]){ n++; d--; } return n; }
function rachaActual(){ const t = today(); return rachaHasta(S.racha[t] ? t : t-1); }
function rachaMejor(){ let mejor = 0, n = 0; const t = today(); for(let d = 1; d <= t; d++){ n = S.racha[d] ? n+1 : 0; mejor = Math.max(mejor, n); } return mejor; }
function renderRacha(){
  const r = rachaActual(), hoy = !!S.racha[today()], el = $('racha');
  $('rachan').textContent = r;
  el.className = 'racha' + (hoy ? ' hoy' : r ? ' pendiente' : '');
  el.setAttribute('aria-label', 'Racha: '+pl(r, 'día seguido', 'días seguidos')+(hoy || !r ? '' : '. Llega hoy al final de un nivel para mantenerla'));
}
function toastRacha(){
  const r = rachaActual(), m = rachaMejor(), hoy = !!S.racha[today()];
  toast(r ? 'Racha: '+pl(r, 'día', 'días')+' · Mejor: '+m+(hoy ? '' : ' · ¡Llega hoy al final de un nivel!')
          : m ? 'Sin racha ahora · Mejor: '+pl(m, 'día', 'días')
              : 'Llega al final de un nivel de hoy para empezar una racha', r ? 'good' : '', 3500);
}
// al terminar un nivel: si es hoy y su primer resultado es haber llegado, el día cuenta para la racha;
// devuelve si con él quedan los tres terminados, llegando o rindiéndose (día completo)
function cerrarDia(){
  const p = ver();
  if(S.dia === today() && p && p.res && !p.res.r) S.racha[S.dia] = 1;
  return diaCompleto(S.dia);
}

// ---------- jugar ----------
// si Pista o Rendirse esperaban «Confirmar», hacer otra cosa en la partida lo cancela (y borra su aviso)
function cancelarConfirmar(){
  if(!$('pista').classList.contains('aviso-negro') && !$('rendirse').classList.contains('aviso')) return;
  restaurarPista(); restaurarRendirse(); toast('');
}
// se escribe en la casilla elegida del borrador y se pasa a la de su derecha; se elige otra tocándola o con las flechas
function elegir(i){
  cancelarConfirmar();
  const p = ver(); if(p && p.fin) return;
  pos = Math.max(0, Math.min(actual().length-1, i)); renderEscalera();
}
function escribir(c){
  cancelarConfirmar();
  const p = ver(); if(p && p.fin) return;
  c = norm(c); if(c.length !== 1 || !LETRAS.includes(c)) return;
  escrito[pos] = c; pos = Math.min(actual().length-1, pos+1);
  toast(''); renderEscalera(); renderTeclado();
}
// Borrar vacía la casilla elegida; si ya estaba vacía, la de su izquierda (y se va a ella)
function borrar(){
  cancelarConfirmar();
  if(!escrito[pos] && pos > 0) pos--;
  if(!escrito[pos]) return renderEscalera();
  escrito[pos] = ''; renderEscalera(); renderTeclado();
}
function fallo(msg){
  toast(msg, 'bad');
  const f = document.querySelector('.fila.borrador'); if(f){ f.classList.remove('mal'); void f.offsetWidth; f.classList.add('mal'); }
}
function subir(){
  cancelarConfirmar();
  const p = partida(); if(p.fin) return;
  if(!lleno()) return toast(hayEscrito() ? 'Escribe la palabra entera' : 'Escribe la palabra nueva');
  const w = escrito.join(''), W = w.toUpperCase(), n = cambios(w, actual());
  if(n === 0) return fallo('No has cambiado ninguna letra');
  if(n > 1) return fallo('Solo puedes cambiar una letra');
  if(!esValida(w)) return fallo('«'+W+'» no está en el diccionario');
  if(escalera().includes(w)) return fallo('«'+W+'» ya está en tu escalera');
  p.pasos.push(w); tocar(p); vaciar();
  const b = reto().b;
  if(w === b) return llegar();
  // a una letra de la llegada, la palabra final es evidente: se pone sola (y no cuenta como peldaño)
  if(cambios(w, b) === 1){ p.pasos.push(b); return llegar(); }
  save(); toast(''); renderTodo(); verLlegada();
}
// Deshacer: si hay algo escrito en el borrador, lo vacía; si no, quita el último peldaño
const hayEscrito = () => escrito.some(c=>c);
function deshacer(){
  cancelarConfirmar();
  const p = ver(); if(p && p.fin) return;
  if(hayEscrito()){ vaciar(); toast(''); renderEscalera(); renderTeclado(); verLlegada(); return; }
  if(!p || !p.pasos.length) return;
  p.pasos.pop(); tocar(p); save(); toast(''); renderTodo(); verLlegada();
}
// Pista: el siguiente peldaño del camino más corto hasta la llegada, por palabras corrientes (o, si no hay, por
// cualquiera válida), sin repetir las de la escalera. Se deja como borrador y suma 1.
// pide confirmación en el propio botón (5 segundos), como Rendirse; jugar mientras tanto la cancela
let pistaPlazo;
function restaurarPista(){ clearTimeout(pistaPlazo); const b = $('pista'); b.classList.remove('aviso-negro'); b.innerHTML = 'Pista <span class="coste">+1</span>'; }
function pista(){
  const p = partida(); if(p.fin) return;
  const usadas = new Set(escalera()), b = reto().b, desde = actual();
  const ruta = camino(desde, b, w=>CORRIENTES.has(w) && !usadas.has(w)) || camino(desde, b, w=>PALABRAS.has(w) && !usadas.has(w));
  if(!ruta) return toast('Desde aquí no hay camino: prueba a deshacer', 'bad', 3500);
  const sig = ruta[1];
  if(escrito.join('') === sig) return toast('La pista ya está en el borrador: pulsa ✓');
  const bp = $('pista');
  if(!bp.classList.contains('aviso-negro')){
    restaurarRendirse();
    bp.classList.add('aviso-negro'); bp.textContent = 'Confirmar';
    toast('La pista suma 1 a tu marcador. ¿La\u00a0quieres?', 'serio', 5000);
    clearTimeout(pistaPlazo); pistaPlazo = setTimeout(()=>{ restaurarPista(); toast(''); }, 5000);
    return;
  }
  restaurarPista();
  p.pistas++; tocar(p); save();
  escrito = [...sig]; pos = 0;
  renderTodo(); verLlegada(); toast('Pista (+1): pulsa ✓ para fijarla', 'good');
}
// Rendirse pide confirmación en el propio botón (5 segundos) y luego enseña la ruta del par
let rendirPlazo;
function restaurarRendirse(){ clearTimeout(rendirPlazo); const b = $('rendirse'); b.classList.remove('aviso'); b.textContent = 'Rendirse'; }
function rendirse(){
  const p = partida(); if(p.fin) return;
  const b = $('rendirse');
  if(!b.classList.contains('aviso')){
    restaurarPista();
    b.classList.add('aviso'); b.textContent = 'Confirmar';
    toast('Toca «Confirmar» para ver la solución', 'bad', 5000);
    clearTimeout(rendirPlazo); rendirPlazo = setTimeout(()=>{ restaurarRendirse(); toast(''); }, 5000);
    return;
  }
  restaurarRendirse(); toast('');
  p.fin = 'rendido'; if(!p.res) p.res = {n:p.pasos.length, p:p.pistas, r:true, e:escalera()};
  tocar(p); vaciar(); cerrarDia(); save(); renderTodo(); abrirResultado();
}
function llegar(){
  const p = partida(); p.fin = 'llegado';
  if(!p.res) p.res = {n:peldanos(p), p:p.pistas, r:false, e:escalera()};
  const completo = cerrarDia(); save(); renderTodo(); verLlegada();
  // el veredicto ya sale en el panel de abajo: el aviso, solo si con este nivel se completa el día
  toast(completo && !p.rep ? '¡Día completado!' : '', 'grande', 3000);
}
// Volver a jugar: la misma escalera desde cero; el primer resultado sigue siendo el que cuenta
function otraVez(){
  const p = partida(); p.pasos = []; p.pistas = 0; p.fin = null; p.rep = true; tocar(p);
  vaciar(); save(); $('resultado').close(); toast(''); renderTodo(); window.scrollTo(0, 0); verLlegada(false);
}
// el siguiente nivel sin terminar de este día (después del actual y, si no, desde el principio)
function siguienteNivel(){
  const i = NIVELES.indexOf(S.nivel);
  return [...NIVELES.slice(i+1), ...NIVELES.slice(0, i)].find(n=>{ const p = ver(S.dia, n); return !p || !p.res; }) || null;
}
function irNivel(n){
  if(!n || n === S.nivel) return;
  S.nivel = n; vaciar(); restaurarRendirse(); restaurarPista(); toast('');
  if($('resultado').open) $('resultado').close();
  renderTodo(); window.scrollTo(0, 0); verLlegada(false);
}
// al abrir un día se empieza por el primer nivel sin terminar
const primerNivel = d => NIVELES.find(n=>{ const p = ver(d, n); return !p || !p.res; }) || NIVELES[0];
function irA(d){ d = Math.min(today(), Math.max(1, d)); S.dia = d; S.nivel = primerNivel(d); vaciar(); restaurarRendirse(); restaurarPista(); toast(''); renderTodo(); window.scrollTo(0, 0); verLlegada(false); }

// ---------- pintar ----------
function renderNiveles(){
  $('niveles').innerHTML = NIVELES.map(n=>{
    const p = ver(S.dia, n), r = reto(S.dia, n), v = p && p.res ? veredicto(p.res, r.par) : null;
    const sub = v ? v.corto : empezada(p) ? 'En curso' : 'Par '+r.par;
    return '<button class="nivel'+(v?' hecho':'')+'" type="button" role="tab" aria-controls="escalera" data-nivel="'+n+'" aria-selected="'+(n===S.nivel)+'">'
      +'<b>'+NOMBRE[n]+'</b><small>'+sub+'</small></button>';
  }).join('');
}
function renderReto(){
  const r = reto(), p = ver() || {pasos:[], pistas:0};
  $('titulo').innerHTML = '<span class="num">Nº '+S.dia+' · </span>'+r.t;
  const n = peldanos(p);
  $('m-par').textContent = r.par; $('m-pasos').textContent = n; $('m-pistas').textContent = p.pistas;
  // por encima del par, los peldaños y las pistas en rojo
  const sobre = n + p.pistas > r.par;
  $('c-pasos').classList.toggle('sobre', sobre); $('c-pistas').classList.toggle('sobre', sobre && p.pistas > 0);
  $('marcador').setAttribute('aria-label', 'Par '+r.par+'. '+pl(n, 'peldaño', 'peldaños')+'. '+pl(p.pistas, 'pista', 'pistas')+'.');
  const nota = $('repeticion');
  nota.hidden = !(p.rep && p.res);
  if(p.rep && p.res) nota.textContent = 'Repetición: tu resultado ('+veredicto(p.res, r.par).corto+') ya está guardado';
}
function celdas(w, b, extra){ return [...w].map((c, i)=>'<span class="celda'+(c===b[i]?' ok':'')+(extra ? extra(i) : '')+'" aria-hidden="true">'+c+'</span>').join(''); }
function renderEscalera(){
  const r = reto(), b = r.b, p = ver() || {pasos:[], fin:null}, esc = escalera(), fin = p.fin;
  let html = '';
  esc.forEach((w, k)=>{
    const tipo = k === 0 ? 'salida' : 'paso', nombre = k === 0 ? 'Salida' : 'Peldaño '+k;
    if(k === esc.length-1 && fin === 'llegado'){
      html += '<div class="fila llegada alcanzada"><span class="sr">'+nombre+', llegada: '+w+'</span>'+celdas(w, b)+'</div>';
    } else {
      html += '<div class="fila '+tipo+'"><span class="sr">'+nombre+': '+w+'</span>'+celdas(w, b)+'</div>';
    }
  });
  if(!fin){
    // borrador: cada casilla es un botón para elegir dónde se escribe; lo escrito, en verde si ya está en su sitio y
    // resaltado si cambia respecto a la palabra anterior; las vacías, con un punto
    html += '<div class="fila borrador" role="group" aria-label="Borrador. Elige la casilla donde escribir">'
      + [...actual()].map((c, i)=>{ const e = escrito[i];
          return '<button type="button" class="celda'+(e ? (e===b[i]?' ok':'')+(e!==c?' cambio':'') : ' hueco')+(i===pos?' sel':'')
            +'" data-i="'+i+'" aria-pressed="'+(i===pos)+'" aria-label="Casilla '+(i+1)+': '+(e ? e.toUpperCase() : 'vacía')+'">'+(e || '·')+'</button>'; }).join('')
      + '</div>';
  }
  if(fin !== 'llegado') html += '<div class="tramo" aria-hidden="true"></div><div class="fila llegada"><span class="sr">Llegada: '+b+'</span>'+celdas(b, '')+'</div>';
  const el = $('escalera'); el.innerHTML = html;
  // con muchas filas, casillas y huecos algo más pequeños (poco a poco, desde la sexta fila) para que quepa más escalera
  const filas = esc.length + (fin ? 0 : 1) + (fin === 'llegado' ? 0 : 1), k = Math.max(0, filas - 5);
  el.style.setProperty('--menos', Math.min(14, k*2.5)+'px'); el.style.setProperty('--hueco', Math.max(4, 8 - k)+'px');
}
function renderTeclado(){
  const p = ver(), fin = !!(p && p.fin);
  $('jugar').hidden = fin; $('terminado').hidden = !fin;
  if(fin){
    const r = reto(), v = veredicto(p.res, r.par), sig = siguienteNivel();
    $('veredicto').textContent = v.largo; $('veredicto').className = 'veredicto '+v.cls;
    $('dia-hecho').hidden = !diaCompleto(S.dia);
    $('siguiente-b').hidden = !sig; if(sig){ $('siguiente-b').textContent = NOMBRE[sig]+' →'; $('siguiente-b').setAttribute('aria-label', 'Siguiente nivel: '+NOMBRE[sig]); }
    return;
  }
  $('deshacer').disabled = !(hayEscrito() || (p && p.pasos.length));
  const subir = document.querySelector('.tecla.subir'); if(subir) subir.disabled = !lleno();
}
function crearTeclado(){
  const tecla = c => '<button class="tecla" type="button" data-k="'+c+'" aria-label="'+c.toUpperCase()+'">'+c+'</button>';
  $('teclado').innerHTML = TECLAS.map((f, i)=>'<div class="tfila">'
    + (i === 2 ? '<button class="tecla ancha subir" type="button" data-k="subir" aria-label="Subir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' : '')
    + [...f].map(tecla).join('')
    + (i === 2 ? '<button class="tecla ancha" type="button" data-k="borrar">Borrar</button>' : '') + '</div>').join('');
}
function renderNav(){
  const t = today(), barra = $('otrodia');
  barra.hidden = S.dia === t;
  $('otrodia-txt').textContent = 'Nº '+S.dia+' · '+fechaLarga(S.dia);
}
function renderTodo(){ renderNav(); renderNiveles(); renderReto(); renderEscalera(); renderTeclado(); renderRacha(); }
// Tras subir, pedir pista, deshacer o cambiar de nivel, que el borrador y la llegada queden por encima del mando (que
// tapa la parte de abajo de la pantalla); si no caben los dos, el borrador. Se mide y se desplaza solo lo que falta.
// Mientras se escribe no se llama, para no mover la pantalla a quien ha subido a mirar la escalera.
function verLlegada(suave = true){
  const m = $('mando'), b = document.querySelector('.fila.borrador'), l = document.querySelector('.fila.llegada');
  if(!m || !l) return;
  const MARGEN = 12, tope = m.getBoundingClientRect().top - MARGEN;
  let falta = l.getBoundingClientRect().bottom - tope;
  if(b){ const rb = b.getBoundingClientRect();
    if(rb.top - falta < MARGEN) falta = rb.bottom - tope;   // no caben los dos: basta con el borrador
    if(rb.top - falta < MARGEN) falta = rb.top - MARGEN; }  // ni el borrador entero: que se vea su parte de arriba
  vistaEn = performance.now();
  if(Math.abs(falta) < 1) return;
  window.scrollBy({top: falta, behavior: suave && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'});
}
// las casillas cambian de tamaño poco a poco: al acabar, se vuelve a medir (si acaba de desplazarse por una acción)
let vistaEn = 0;
const reajustar = e => { if(e.target === $('escalera') && performance.now() - vistaEn < 800) verLlegada(); };

let tt;
function toast(msg, kind, ms = 2400){
  const t = $('toast');
  t.textContent = msg; t.className = 'toast'+(kind?' '+kind:'');
  clearTimeout(tt); if(msg) tt = setTimeout(()=>{ t.textContent = ''; t.className = 'toast'; }, ms);
}

// ---------- resultado ----------
const rutaHTML = (ws, b, corta) => ws.map((w, i)=>'<span class="w'+(w===b?' fin':'')+'">'+w+'</span>').join('<span class="flecha" aria-hidden="true">→</span>')
  + (corta ? '<span class="flecha" aria-hidden="true">→</span><span class="vacio">…</span>' : '');
function abrirResultado(){
  const r = reto(), p = ver(); if(!p || !p.res) return;
  const v = veredicto(p.res, r.par);
  $('res-titulo').textContent = 'Nº '+S.dia+' · '+NOMBRE[S.nivel]+' · '+r.t;
  $('res-veredicto').textContent = v.largo; $('res-veredicto').className = 'res-veredicto '+v.cls;
  $('res-cifras').innerHTML = (p.res.r ? tras(p.res) : cuenta(p.res)).replace(/(\d+)/g, '<b>$1</b>')+' · par '+r.par;
  // al repetir, el resultado de esta vez (el que cuenta sigue siendo el primero)
  const repe = $('res-repe'), estaVez = p.rep && p.fin;
  repe.hidden = !estaVez;
  if(estaVez){ const rr = {n:peldanos(p), p:p.pistas, r:p.fin === 'rendido'};
    repe.textContent = 'Esta vez: '+(rr.r ? 'te has rendido '+tras(rr).toLowerCase() : cuenta(rr)+' · '+veredicto(rr, r.par).corto.toLowerCase())+'. Cuenta tu primer resultado.'; }
  const tuya = p.res.e || [r.a];
  $('res-tuya').innerHTML = rutaHTML(tuya, r.b, tuya[tuya.length-1] !== r.b);
  $('res-par').innerHTML = rutaHTML(r.sol, r.b);
  // si tu escalera es la ruta del par, una sola fila (el aviso del mínimo se sigue viendo)
  const igual = tuya.join() === r.sol.join(), min = $('res-min'); min.hidden = !(r.min < r.par);
  $('res-tuya-etq').textContent = igual ? 'Tu escalera: ¡la ruta del par!' : 'Tu escalera';
  $('res-par-etq').hidden = $('res-par').hidden = igual; $('res-par-bloque').hidden = igual && min.hidden;
  min.textContent = 'Con palabras menos corrientes se puede hacer en '+pl(r.min, 'peldaño', 'peldaños')+'.';
  $('res-nota').textContent = r.note;
  $('compartir-txt').textContent = textoCompartir();
  const c = $('copiar'); clearTimeout(c.plazo); c.textContent = 'Copiar resultado';
  const sig = siguienteNivel(), bs = $('siguiente');
  $('siguiente').setAttribute('aria-label', sig ? 'Siguiente nivel: '+NOMBRE[sig] : '');
  bs.hidden = !sig; if(sig) bs.textContent = NOMBRE[sig]+' →';
  const d = $('resultado'); if(!d.open) d.showModal(); d.scrollTop = 0;
  (sig ? bs : $('res-cerrar')).focus({focusVisible:false});
}
// Peldaño #3 · Intermedio / De la reja al muro / 🪜 5 peldaños (par 4) · +1 / enlace
function textoCompartir(){
  const r = reto(), p = ver(), v = veredicto(p.res, r.par);
  const linea = p.res.r ? '🏳️ Me he rendido (par '+r.par+')' : '🪜 '+cuenta(p.res)+' (par '+r.par+') · '+v.compartir;
  return ['Peldaño #'+S.dia+' · '+NOMBRE[S.nivel], r.t, linea, URL_COMPARTIR].join('\n');
}
async function copiar(){
  const text = textoCompartir(), b = $('copiar');
  let ok = false;
  try{ await navigator.clipboard.writeText(text); ok = true; }catch(e){}
  if(!ok){
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
    $('resultado').appendChild(ta); ta.select();
    try{ ok = document.execCommand('copy'); }catch(e){}
    ta.remove();
  }
  b.textContent = ok ? '¡Copiado! Pégalo donde quieras' : 'No se ha podido copiar';
  clearTimeout(b.plazo); b.plazo = setTimeout(()=>{ b.textContent = 'Copiar resultado'; }, 2400);
}

// ---------- calendario de días pasados ----------
// Un mes cada vez (semana de lunes a domingo); solo se pueden abrir los días del 1 a hoy.
let calMes;
function renderCal(){
  const t = today(), {y, m} = calMes, primero = new Date(y, m, 1), diasMes = new Date(y, m+1, 0).getDate();
  const fin = dateOf(t), ini = dateOf(1);
  $('cal-titulo').textContent = primero.toLocaleDateString('es-ES', {month:'long', year:'numeric'});
  $('cal-prev').disabled = y*12+m <= ini.getFullYear()*12+ini.getMonth();
  $('cal-next').disabled = y*12+m >= fin.getFullYear()*12+fin.getMonth();
  let html = '<span class="cal-dia vacio"></span>'.repeat((primero.getDay()+6) % 7);
  for(let n = 1; n <= diasMes; n++){
    const d = Math.round((Date.UTC(y, m, n) - START)/864e5) + 1;
    if(d < 1 || d > t){ html += '<button class="cal-dia" type="button" disabled>'+n+'</button>'; continue; }
    const completo = diaCompleto(d), hechos = NIVELES.filter(x=>(ver(d, x)||{}).res).length, jugado = NIVELES.some(x=>empezada(ver(d, x)));
    const cls = (completo?' completo':'')+(jugado?' jugado':'')+(d===t?' hoy':'')+(d===S.dia?' actual':'');
    const desc = 'nº '+d+(d===t?', hoy':'')+(completo ? ', los tres niveles' : jugado ? ', '+hechos+' de 3 niveles' : '');
    html += '<button class="cal-dia'+cls+'" type="button" data-dia="'+d+'" aria-label="'+n+' de '+primero.toLocaleDateString('es-ES', {month:'long'})+', '+desc+'"'+(d===S.dia?' aria-current="date"':'')+'>'+n+'</button>';
  }
  $('cal-grid').innerHTML = html;
}
function moverMes(k){ const d = new Date(calMes.y, calMes.m+k, 1); calMes = {y:d.getFullYear(), m:d.getMonth()}; renderCal(); }
function abrirCal(cual){
  const f = dateOf(S.dia); calMes = {y:f.getFullYear(), m:f.getMonth()}; renderCal(); $('calendario').showModal();
  pestana(cual || 'cal'); const a = cual === 'est' ? $('tab-est') : document.querySelector('.cal-dia.actual'); if(a) a.focus({focusVisible:false});
}
function pestana(cual){
  ['cal', 'est'].forEach(p=>{ $('tab-'+p).setAttribute('aria-selected', p===cual); $('panel-'+p).hidden = p!==cual; });
  if(cual === 'est') renderEst();
}

// ---------- estadísticas: días completados, rachas y, por nivel, partidas y veces en par o bajo par ----------
function renderEst(){
  const t = today(); let completos = 0, total = 0;
  const por = Object.fromEntries(NIVELES.map(n=>[n, {bajo:0, par:0, sobre:0, rendido:0}]));
  for(let d = 1; d <= t; d++){
    if(diaCompleto(d)) completos++;
    NIVELES.forEach(n=>{ const p = ver(d, n); if(p && p.res){ por[n][veredicto(p.res, reto(d, n).par).cls]++; total++; } });
  }
  const cifra = (n, txt) => '<div class="est-cifra"><b>'+n+'</b><span>'+txt+'</span></div>';
  $('est-cifras').innerHTML = cifra(completos, completos===1 ? 'día completado' : 'días completados') + cifra(rachaActual(), 'racha actual') + cifra(rachaMejor(), 'mejor racha');
  $('est-niveles').innerHTML = NIVELES.map(n=>{
    const c = por[n], jugadas = c.bajo + c.par + c.sobre + c.rendido, buenas = c.bajo + c.par;
    const tramo = (k, cls, txt) => c[k] ? '<i class="'+cls+'" style="width:'+(100*c[k]/jugadas)+'%" title="'+txt+': '+c[k]+'"></i>' : '';
    return '<div class="est-nivel"><div class="est-cab"><b>'+NOMBRE[n]+'</b><span>'+pl(jugadas, 'partida', 'partidas')
      +(jugadas ? ' · '+buenas+' en par o bajo par ('+Math.round(100*buenas/jugadas)+'\u00A0%)' : '')+'</span></div>'
      +'<div class="est-barra" role="img" aria-label="'+c.bajo+' bajo par, '+c.par+' en par, '+c.sobre+' sobre el par, '+c.rendido+' rendidas">'
      +tramo('bajo', 's-bajo', 'Bajo par')+tramo('par', 's-par', 'En par')+tramo('sobre', 's-sobre', 'Sobre el par')+tramo('rendido', 's-rend', 'Rendido')+'</div></div>';
  }).join('') + (total ? '' : '<p class="est-vacio">Aún no has terminado ninguna escalera. ¡Empieza hoy!</p>');
}

// ---------- tema: claro por defecto, modo noche a elección (se recuerda en este navegador) ----------
const TEMA = 'peldano-tema';
function aplicarTema(oscuro){
  document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
  const m = $('theme-color'); if(m) m.setAttribute('content', oscuro ? '#131B26' : '#F6F1E7');
  const c = $('modo-noche'); if(c) c.checked = oscuro;
}
function cambiarTema(oscuro){ aplicarTema(oscuro); try{ oscuro ? localStorage.setItem(TEMA, 'oscuro') : localStorage.removeItem(TEMA); }catch(e){} }
window.addEventListener('storage', e=>{ if(e.key === TEMA || e.key === null) aplicarTema(e.newValue === 'oscuro'); });   // otras pestañas

// ---------- reglas ----------
const REGLAS_VISTAS = 'peldano-reglas-vistas';
function abrirReglas(){ const d = $('reglas'); if(d.open) return; d.showModal(); $('reglas-cerrar').focus({focusVisible:false}); }
// la primera vez que se juega, las reglas se abren solas al irse la portada
function quizaReglas(){ try{ if(localStorage.getItem(REGLAS_VISTAS)) return; localStorage.setItem(REGLAS_VISTAS, '1'); }catch(e){ return; } abrirReglas(); }

// ---------- invitación a instalar ----------
// Tras el tercer día jugado, una sola vez: en iPhone/iPad, los dos pasos de Safari (no hay aviso automático);
// donde el navegador lo permite (Android, Chrome), un botón que abre su diálogo de instalar. Nunca si ya está instalada.
const INSTALAR_VISTO = 'peldano-instalar';
let avisoInstalar = null;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); avisoInstalar = e; quizaInstalar(); });
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function quizaInstalar(){
  const el = $('instalar');
  if(!el || !el.hidden || instalada() || !RETOS) return;
  let visto = null; try{ visto = localStorage.getItem(INSTALAR_VISTO); }catch(e){ return; }
  const jugados = Object.values(S.partidas).filter(niv=>Object.values(niv).some(p=>p.res)).length;
  if(visto || jugados < 3 || !(esIOS() || avisoInstalar)) return;
  $('instalar-ios').hidden = !esIOS();
  $('instalar-boton').hidden = esIOS() || !avisoInstalar;
  el.hidden = false;
  try{ localStorage.setItem(INSTALAR_VISTO, '1'); }catch(e){}   // sale una sola vez, aunque no se cierre
}
function instalar(){ if(!avisoInstalar) return; avisoInstalar.prompt(); avisoInstalar = null; $('instalar').hidden = true; }

function start(){
  load(); S.dia = today(); S.nivel = primerNivel(S.dia);
  crearTeclado();
  const dialogos = ['reglas', 'resultado', 'calendario'].map($);
  const abierto = () => dialogos.some(d=>d.open);
  // un clic con el ratón o el dedo no deja el foco en el botón, para que Intro siga subiendo el peldaño
  const sinFoco = e => { if(e.detail > 0 && e.currentTarget.blur) e.currentTarget.blur(); };
  $('niveles').onclick = e=>{ const b = e.target.closest('[data-nivel]'); if(!b) return; sinFoco({detail:e.detail, currentTarget:b}); irNivel(b.dataset.nivel); };
  $('escalera').onclick = e=>{ const b = e.target.closest('.fila.borrador [data-i]'); if(b){ sinFoco({detail:e.detail, currentTarget:b}); elegir(+b.dataset.i); } };
  $('teclado').onclick = e=>{ const b = e.target.closest('[data-k]'); if(!b) return; sinFoco({detail:e.detail, currentTarget:b});
    const k = b.dataset.k; k === 'borrar' ? borrar() : k === 'subir' ? subir() : escribir(k); };
  $('deshacer').onclick = e=>{ sinFoco(e); deshacer(); };
  $('pista').onclick = e=>{ sinFoco(e); pista(); };
  $('rendirse').onclick = e=>{ sinFoco(e); rendirse(); };
  $('ver-resultado').onclick = abrirResultado;
  $('siguiente-b').onclick = ()=>irNivel(siguienteNivel());
  $('siguiente').onclick = ()=>irNivel(siguienteNivel());
  $('otra-vez').onclick = otraVez;
  $('copiar').onclick = copiar;
  $('res-cerrar').onclick = ()=>$('resultado').close();
  $('volver').onclick = ()=>irA(today());
  $('racha').onclick = toastRacha;
  $('ayuda').onclick = abrirReglas;
  $('reglas-cerrar').onclick = ()=>$('reglas').close();
  const noche = $('modo-noche');
  noche.checked = document.documentElement.getAttribute('data-theme') === 'dark';
  noche.onchange = ()=>cambiarTema(noche.checked);
  $('pasados').onclick = ()=>abrirCal();
  $('cal-prev').onclick = ()=>moverMes(-1);
  $('cal-next').onclick = ()=>moverMes(1);
  $('cal-cerrar').onclick = ()=>$('calendario').close();
  $('tab-cal').onclick = ()=>pestana('cal');
  $('tab-est').onclick = ()=>pestana('est');
  $('cal-grid').onclick = e=>{ const b = e.target.closest('[data-dia]'); if(!b) return; $('calendario').close(); irA(+b.dataset.dia); };
  dialogos.forEach(d=>d.addEventListener('click', e=>{ if(e.target === d) d.close(); }));   // tocar fuera las cierra
  // teclado físico: letras, Intro (subir), Retroceso (borrar) y flechas (elegir casilla)
  document.addEventListener('keydown', e=>{
    if(abierto() || e.ctrlKey || e.metaKey || e.altKey) return;
    const enBoton = e.target.closest && e.target.closest('button, a, input') && !e.target.closest('.fila.borrador, .teclado');
    if(e.key === 'Enter'){ if(enBoton) return; e.preventDefault(); subir(); }
    else if(e.key === 'Backspace' || e.key === 'Delete'){ e.preventDefault(); borrar(); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ if(e.target.closest && e.target.closest('[role="tab"]')) return; e.preventDefault(); elegir(pos + (e.key === 'ArrowLeft' ? -1 : 1)); }
    else if(e.key.length === 1 && LETRAS.includes(norm(e.key))){ e.preventDefault(); escribir(e.key); }
  });
  // cambio de día con la app abierta: si se jugaba el día de hoy, se pasa al nuevo; si uno pasado, se queda en él
  let ultimoHoy = S.dia;
  const cambioDeDia = ()=>{
    const t = today(); if(t === ultimoHoy) return;
    if(S.dia === ultimoHoy && !abierto()){ irA(t); toast('¡Nuevas escaleras del día!', 'good'); }
    else { renderNav(); renderRacha(); }
    ultimoHoy = t;
  };
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') cambioDeDia(); });
  setInterval(cambioDeDia, 30000);
  $('escalera').addEventListener('transitionend', reajustar);
  renderTodo(); verLlegada(false); quizaInstalar();
  $('instalar-cerrar').onclick = ()=>{ $('instalar').hidden = true; };
  $('instalar-boton').onclick = instalar;
}

// ---------- pie ----------
// El año de los derechos es el actual. El correo se monta aquí, a trozos, para que no aparezca entero en los archivos.
$('anio-derechos').textContent = new Date().getFullYear();
{
  const correo = 'ecasanovabisc' + '@' + ['gmail', 'com'].join('.');
  const enlace = document.createElement('a');
  enlace.href = 'mailto:' + correo; enlace.textContent = correo;
  $('contacto').append(' · ', enlace);
}

// ---------- portada ----------
// Se queda lo justo para ver montarse la escalera (o menos si se toca) y se va cuando el juego está listo.
const portada = $('portada');
const T0 = performance.now(), DURA = matchMedia('(prefers-reduced-motion: reduce)').matches ? 800 : 2300;
let listo = false, tocada = false;
function quitarPortada(){
  if(!portada || portada.classList.contains('fuera')) return;
  portada.classList.add('fuera');
  if(listo) quizaReglas();
  setTimeout(()=>portada.remove(), 500);
}
function quizaQuitarPortada(){ if(listo && (tocada || performance.now()-T0 >= DURA)) quitarPortada(); }
if(portada){
  portada.addEventListener('click', ()=>{ tocada = true; quizaQuitarPortada(); });
  setTimeout(quizaQuitarPortada, DURA);
}

const json = url => fetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
Promise.all([json('data/retos.json'), json('data/diccionario.json')])
  .then(([retos, dic])=>{
    RETOS = retos; PALABRAS = new Set(dic.palabras); CORRIENTES = new Set(dic.corrientes);
    start(); listo = true; quizaQuitarPortada();
  })
  .catch(()=>{ quitarPortada(); $('escalera').innerHTML = '<p class="cargando">No se han podido cargar las escaleras. Comprueba la conexión y vuelve a intentarlo.</p>'; });

if('serviceWorker' in navigator) window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
