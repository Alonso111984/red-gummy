import type { Business } from './types';
import { normalizePhone, safeMapUrl } from './engine';

export function validateBusiness(value: unknown): Business {
  const fail = (message: string): never => { throw new Error(`Configuración: ${message}`); };
  if (!value || typeof value !== 'object') fail('no se recibió un objeto.');
  const b = value as Business;
  if (b.schemaVersion !== 1) fail('versión incompatible.');
  if (b.visualStyle !== undefined && b.visualStyle !== 'real-object-ui') fail('esta versión de la plantilla implementa Real Object + UI; adapta el diseño antes de usar otro estilo.');
  const id = (v: unknown) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,60}$/.test(v);
  const text = (v: unknown) => typeof v === 'string';
  const cents = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 100_000_000;
  const unique = (array: {id:string}[]) => new Set(array.map(item => item.id)).size === array.length;
  const image = (v: unknown) => text(v) && (/^images\/[a-zA-Z0-9/_ .-]+$/.test(v as string) || /^data:image\/(png|jpeg|webp);base64,/.test(v as string));
  if (!id(b.id) || !text(b.revision) || !b.revision.trim()) fail('id o revisión no válidos.');
  if (typeof b.demo !== 'boolean' || !text(b.name) || !b.name.trim() || !text(b.tagline) || !text(b.description)) fail('datos de identidad incompletos.');
  if (b.currency !== 'USD') fail('la moneda de esta versión debe ser USD.');
  try { new Intl.NumberFormat(b.locale); new Intl.DateTimeFormat('es', {timeZone:b.hours.timeZone}); } catch { fail('idioma o zona horaria no válidos.'); }
  if (!text(b.whatsapp)) fail('falta WhatsApp.');
  if (!b.demo) { try { normalizePhone(b.whatsapp); } catch { fail('WhatsApp real con código de país requerido fuera de demo.'); } }
  if (!b.theme || ![b.theme.primary, b.theme.accent, b.theme.background].every(c => /^#[0-9a-fA-F]{6}$/.test(c))) fail('colores en formato #RRGGBB requeridos.');
  const luminance = (color:string) => {
    const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
  };
  const contrast=(a:string,c:string)=>{const x=luminance(a),y=luminance(c);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  if (contrast(b.theme.primary,'#ffffff')<4.5 || contrast(b.theme.primary,b.theme.background)<4.5 || contrast('#253b33',b.theme.background)<4.5) fail('usa un color principal oscuro y un fondo claro para mantener el texto legible.');
  if (!b.hero || !text(b.hero.title) || !text(b.hero.subtitle) || !image(b.hero.image)) fail('portada no válida.');
  if (b.logo !== null && !(text(b.logo) && /^(images\/|logo\.)[a-zA-Z0-9/_ .-]+$/.test(b.logo))) fail('logo local no válido.');
  if (!b.location || !text(b.location.address) || !text(b.location.pickupInstructions) || (b.location.mapUrl !== null && !safeMapUrl(b.location.mapUrl))) fail('ubicación o mapa no válidos.');
  if (!b.hours || typeof b.hours.enforce !== 'boolean' || !text(b.hours.closedMessage) || !b.hours.weekly || typeof b.hours.weekly !== 'object') fail('horarios incompletos.');
  for (const [day, intervals] of Object.entries(b.hours.weekly)) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(intervals)) fail('día de horario no válido.');
    for (const interval of intervals) {
      if (!interval || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.start) || !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(interval.end) || interval.start === interval.end) fail('franja de horario no válida.');
    }
  }
  if (!b.delivery || typeof b.delivery.enabled !== 'boolean' || !Array.isArray(b.delivery.zones) || !b.pickup || typeof b.pickup.enabled !== 'boolean') fail('modalidades incompletas.');
  if (!b.delivery.enabled && !b.pickup.enabled) fail('habilita delivery o retiro.');
  if (b.delivery.enabled && !b.delivery.zones.length) fail('delivery necesita zonas.');
  if (!b.delivery.zones.every(z => id(z.id) && text(z.name) && z.name.trim() && cents(z.feeCents)) || !unique(b.delivery.zones)) fail('zonas o tarifas no válidas.');
  if (!b.payments || typeof b.payments.cash !== 'boolean' || typeof b.payments.transfer !== 'boolean' || (!b.payments.cash && !b.payments.transfer)) fail('habilita al menos un método de pago.');
  if (b.payments.transfer && (!b.payments.bank || !['name','accountType','account','holder','instructions'].every(key => text(b.payments.bank![key as keyof NonNullable<Business['payments']['bank']>])) || !b.payments.bank.name.trim() || !b.payments.bank.account.trim() || !b.payments.bank.holder.trim())) fail('transferencia requiere datos bancarios.');
  if (!Array.isArray(b.categories) || !b.categories.length || !b.categories.every(c => id(c.id) && text(c.name) && c.name.trim()) || !unique(b.categories)) fail('categorías no válidas.');
  if (!Array.isArray(b.products) || !b.products.length || !unique(b.products)) fail('catálogo vacío o productos duplicados.');
  for (const p of b.products) {
    if (!id(p.id) || !b.categories.some(c => c.id === p.categoryId) || !text(p.name) || !p.name.trim() || !text(p.description) || !cents(p.priceCents) || !image(p.image) || typeof p.available !== 'boolean') fail(`producto ${p.id ?? '?'} no válido.`);
    if (p.pairPriceCents !== undefined && (!cents(p.pairPriceCents) || p.pairPriceCents > p.priceCents * 2 || p.variants?.length)) fail('promoción de dos unidades no válida.');
    if (p.badge !== undefined && !text(p.badge)) fail('etiqueta no válida.');
    if (p.featured !== undefined && typeof p.featured !== 'boolean') fail('producto destacado no válido.');
    if (p.contents !== undefined && (!Array.isArray(p.contents) || !p.contents.every(text))) fail('contenido de combo no válido.');
    if (p.variants !== undefined && (!Array.isArray(p.variants) || !unique(p.variants) || !p.variants.every(v => id(v.id) && text(v.name) && typeof v.available === 'boolean' && Number.isSafeInteger(v.priceDeltaCents) && cents(p.priceCents + v.priceDeltaCents)))) fail('variantes no válidas.');
    if (p.available && p.variants?.length && !p.variants.some(v => v.available)) fail('producto disponible sin variantes disponibles.');
  }
  if (!b.order || !text(b.order.cta) || !b.order.cta.trim() || !Number.isInteger(b.order.maxQuantity) || b.order.maxQuantity < 1 || b.order.maxQuantity > 99) fail('configuración de pedido no válida.');
  if (!b.demo && b.pickup.enabled && !b.location.address.trim()) fail('retiro requiere dirección real del local.');
  if (!b.demo) {
    const placeholder=/demostraci[oó]n|por configurar|NO ES UNA CUENTA REAL|\(ejemplo\)/i;
    const operational=[b.location.address,...b.delivery.zones.map(z=>z.name),...(b.payments.transfer&&b.payments.bank?Object.values(b.payments.bank):[])];
    if(operational.some(v=>placeholder.test(v)))fail('reemplaza las zonas, la dirección y los datos bancarios de ejemplo antes de usar el modo real.');
  }
  return b;
}

declare global { interface Window { __FOOD_CONFIG__?: unknown; __FOOD_STANDALONE__?: boolean; __FOOD_OFFLINE_CONFIG__?: boolean } }
export async function loadBusiness(): Promise<Business> {
  if (window.__FOOD_CONFIG__) return validateBusiness(window.__FOOD_CONFIG__);
  const response = await fetch(`${import.meta.env.BASE_URL}business.json`, {cache:'no-cache'});
  if (!response.ok) throw new Error('No se pudo cargar la configuración del negocio.');
  window.__FOOD_OFFLINE_CONFIG__ = response.headers.get('X-Food-Offline') === '1';
  return validateBusiness(await response.json());
}
