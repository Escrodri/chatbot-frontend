/**
 * Reglas de los textos de un producto, del lado del panel.
 *
 * Son las mismas que aplica el backend al guardar
 * (backend/src/services/producto-textos.js). Están repetidas acá para avisar
 * mientras se escribe, no para reemplazar la validación del servidor.
 */

export const LIMITES = Object.freeze({
  conBotones: 1024,
  texto: 4096,
  boton: 20,
  partes: 3,
  links: 10,
  muestras: 3,
  guia: 6000
});

/** Qué significa cada variable, en palabras de quien vende. */
export const AYUDA_VARIABLES = Object.freeze({
  saludo: 'Buen día, Buenas tardes o Buenas noches, según la hora',
  nombre: 'El nombre del cliente (si no lo tenemos, se omite)',
  producto: 'El nombre de este producto',
  precio: 'El precio de esa persona',
  precio_texto: 'El precio; si tiene un descuento real agrega "(en vez de …)"',
  precio_lista: 'El precio normal',
  extra: 'El nombre del producto extra',
  precio_extra: 'Lo que cuesta sumar el extra',
  total_con_extra: 'Lo que paga si suma el extra',
  total_sin_extra: 'Lo que paga sin el extra',
  datos_cuenta: 'Alias, titular, banco y cuenta (se cargan en Pedidos)',
  total: 'Lo que tiene que transferir, con el extra si lo sumó',
  detalle: 'El desglose, solo si sumó el extra',
  links: 'Los links de entrega de todo lo que compró',
  vence: 'Hasta cuándo vale el precio de recuperación',
  moneda: 'La moneda del producto'
});

const BASE = ['saludo', 'nombre', 'producto', 'precio_texto', 'precio', 'precio_lista'];

export const VARIABLES_POR_PASO = Object.freeze({
  presentacion: BASE,
  muestras: BASE,
  extra: ['nombre', 'producto', 'extra', 'precio_extra', 'total_con_extra', 'total_sin_extra'],
  pago: ['nombre', 'producto', 'datos_cuenta', 'total', 'detalle'],
  entrega: ['saludo', 'nombre', 'producto', 'links'],
  seguimiento: ['nombre', 'producto', 'precio', 'vence']
});

/** Las que acepta el backend en cada paso (una que no está acá hace fallar el guardado). */
const PERMITIDAS_POR_PASO = Object.freeze({
  presentacion: BASE,
  muestras: BASE,
  extra: [...BASE, 'extra', 'precio_extra', 'total_con_extra', 'total_sin_extra'],
  pago: [...BASE, 'datos_cuenta', 'total', 'detalle'],
  entrega: ['saludo', 'nombre', 'producto', 'links'],
  seguimiento: ['nombre', 'producto', 'precio', 'vence', 'moneda']
});

export const CLAVES_SEGUIMIENTO = Object.freeze([
  'nivel_1_mirando',
  'nivel_1_decidido',
  'nivel_2_mirando',
  'nivel_2_decidido',
  'nivel_2_sin_descuento',
  'nivel_3',
  'nivel_3_sin_descuento'
]);

/** Los mismos respaldos que usa el backend cuando el producto no tiene los suyos. */
export const EXTRA_POR_DEFECTO =
  'Antes de pasarte los datos: podés sumar *{{extra}}* por {{precio_extra}}.\n\n' +
  'Con el extra: {{total_con_extra}}\nSolo {{producto}}: {{total_sin_extra}}\n\n¿Lo sumamos?';

export const PAGO_POR_DEFECTO =
  '¡Perfecto! 🙌 Te paso los datos 👇\n\n{{datos_cuenta}}\n\n*Monto:* {{total}}{{detalle}}\n\n' +
  'Cuando transfieras mandame la captura por acá y te paso el enlace de descarga enseguida.\n\n' +
  'Cualquier cosa, escribime por este mismo chat.';

export const ENTREGA_POR_DEFECTO = '¡Listo, {{nombre}}! Ya confirmamos tu pago 🙌\n\n📄 *{{producto}}*\n{{links}}';

export const BOTONES_POR_DEFECTO = Object.freeze({
  comprar: 'Lo quiero',
  muestras: 'Ver muestras',
  extra_si: 'Sí, sumalo',
  extra_no: 'No, gracias'
});

/** Las {{variables}} de un texto que ese paso no conoce. */
export function variablesDesconocidas(plantilla, paso) {
  const permitidas = PERMITIDAS_POR_PASO[paso] || [];
  const usadas = [...String(plantilla || '').matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map(m => m[1]);
  return [...new Set(usadas.filter(v => !permitidas.includes(v.toLowerCase())))];
}

/** Igual que el backend: rellena variables y saca la coma que queda sin nombre. */
export function renderizar(plantilla, vars = {}) {
  return String(plantilla || '')
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => (Object.prototype.hasOwnProperty.call(vars, k.toLowerCase()) ? String(vars[k.toLowerCase()] ?? '') : ''))
    .replace(/,\s*([!?.])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatearPrecio(valor, moneda = 'PYG') {
  const n = Number(valor) || 0;
  const locales = { PYG: 'es-PY', USD: 'en-US', BRL: 'pt-BR', ARS: 'es-AR' };
  const simbolos = { PYG: 'Gs.', USD: 'US$', BRL: 'R$', ARS: '$' };
  const txt = new Intl.NumberFormat(locales[moneda] || 'es-PY', {
    maximumFractionDigits: moneda === 'PYG' ? 0 : 2
  }).format(n);
  return `${simbolos[moneda] || ''} ${txt}`.trim();
}

export const linkValido = (url) => /^https?:\/\/\S+$/i.test(String(url || '').trim());

/** Los links de un producto como vienen del backend (o de uno viejo con un solo link). */
export function linksDe(p) {
  const lista = Array.isArray(p?.entregables) ? p.entregables.filter(e => linkValido(e?.url)) : [];
  if (lista.length) return lista;
  return p?.delivery_url ? [{ etiqueta: '', url: p.delivery_url }] : [];
}

/** El bloque de links tal como llega en el mensaje de entrega. */
export function bloqueLinks(links, extras = []) {
  const lineas = (ls) => ls.map(l => (l.etiqueta ? `${l.etiqueta}: ${l.url}` : l.url)).join('\n');
  const partes = [lineas(links.filter(l => l.url))];
  for (const e of extras) {
    const ls = linksDe(e);
    if (ls.length) partes.push(`📄 *${e.name}*\n${lineas(ls)}`);
  }
  return partes.filter(Boolean).join('\n\n');
}

/** Los datos de la cuenta como salen en el mensaje de pago. */
export function bloqueCuenta(d) {
  if (!d || !d.configurado) {
    return '⚡ *Alias:* (tu alias)\n*Titular:* (titular de la cuenta)\n*Banco:* (banco)';
  }
  const lineas = [];
  const alias = d.alias || d.documento;
  if (alias) lineas.push(`⚡ *Alias:* ${alias}`);
  if (d.titular) lineas.push(`*Titular:* ${d.titular}`);
  if (d.banco) lineas.push(`*Banco:* ${d.banco}`);
  if (d.cuenta && d.cuenta !== alias) {
    lineas.push('', `Con el alias es un campo y listo. Si tu app te pide la cuenta completa, es *${d.cuenta}*, mismo titular.`);
  }
  return lineas.join('\n');
}

/**
 * ¿Está listo para vender? Lo que falta bloquea; los avisos no.
 *
 * `faltan` y `avisos` dicen en qué paso está cada cosa, para marcarlo en el
 * índice de la pantalla y en la lista de productos.
 *
 * @param {object} p El producto (del formulario o del listado)
 * @param {object[]} productos Todos, para revisar el producto extra
 */
export function revisarProducto(p, productos = []) {
  const faltan = [];
  const avisos = [];
  const m = p?.mensajes || {};

  if (!String(p?.name || '').trim()) faltan.push({ paso: 'producto', texto: 'Nombre' });
  if (!(Number(p?.price) > 0)) faltan.push({ paso: 'producto', texto: 'Precio' });

  // Un producto que solo se vende como extra nunca se presenta solo.
  const soloExtra = Boolean(p?.solo_extra);

  const partes = (m.presentacion || []).filter(t => String(t || '').trim());
  if (!partes.length && !soloExtra) faltan.push({ paso: 'presentacion', texto: 'Mensaje de presentación' });

  const links = (Array.isArray(p?.entregables) ? p.entregables : []).filter(e => String(e?.url || '').trim());
  if (!links.length && !p?.delivery_url) faltan.push({ paso: 'entrega', texto: 'Link de entrega' });
  if (links.some(e => !linkValido(e.url))) faltan.push({ paso: 'entrega', texto: 'Un link no empieza con https://' });

  const b = p?.bump || {};
  if (b.activo && !soloExtra) {
    const extra = productos.find(x => Number(x.id) === Number(b.product_id));
    if (!b.product_id) faltan.push({ paso: 'extra', texto: 'Elegir el producto extra' });
    else if (extra && !linksDe(extra).length) faltan.push({ paso: 'extra', texto: `"${extra.name}" no tiene link de entrega` });
    if (!(Number(b.precio) > 0)) faltan.push({ paso: 'extra', texto: 'Precio del extra' });
  }

  if (!p?.cover_url) avisos.push({ paso: 'producto', texto: 'Sin portada' });
  if (!soloExtra && !(p?.preview_urls || []).length) avisos.push({ paso: 'muestras', texto: 'Sin páginas de muestra' });
  if (!soloExtra && m.seguimiento && m.seguimiento.activo === false) avisos.push({ paso: 'seguimiento', texto: 'Seguimiento apagado' });

  return { listo: faltan.length === 0, faltan, avisos };
}

/** Un identificador a partir del nombre, igual que el backend. */
export function slugDesde(nombre) {
  return String(nombre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
