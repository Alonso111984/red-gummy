import type { Business, CartItem, CartLine, Coordinates, Customer, OrderTotals, PreparedOrder } from './types';

export function money(cents: number, business: Pick<Business, 'currency' | 'locale'>) {
  return new Intl.NumberFormat(business.locale, { style: 'currency', currency: business.currency }).format(cents / 100);
}
export function cartKey(item: Pick<CartItem, 'productId' | 'variantId'>) {
  return `${item.productId}:${item.variantId ?? ''}`;
}
export function normalizePhone(value: string) {
  if (!/^[+\d\s().-]*$/.test(value)) throw new Error('El WhatsApp contiene caracteres no válidos.');
  const digits = value.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error('Configura un WhatsApp real con código de país.');
  return digits;
}
export function safeMapUrl(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
export function gpsUrl(gps: Coordinates) {
  if (!Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude) || Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180) throw new Error('Ubicación no válida.');
  return `https://www.google.com/maps?q=${gps.latitude.toFixed(6)},${gps.longitude.toFixed(6)}`;
}
export function sanitizeCart(raw: unknown, b: Business): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, CartItem>();
  for (const value of raw.slice(0, 500)) {
    if (!value || typeof value !== 'object') continue;
    const item = value as CartItem;
    const product = b.products.find(p => p.id === item.productId && p.available);
    if (!product || !Number.isInteger(item.quantity) || item.quantity <= 0) continue;
    if (product.variants?.length) {
      if (!product.variants.some(v => v.id === item.variantId && v.available)) continue;
    } else if (item.variantId !== undefined) continue;
    const key = cartKey(item);
    const prev = merged.get(key)?.quantity ?? 0;
    merged.set(key, { productId: product.id, ...(item.variantId ? {variantId: item.variantId} : {}), quantity: Math.min(prev + item.quantity, b.order.maxQuantity) });
  }
  return [...merged.values()];
}
export function cartLines(cart: CartItem[], b: Business): CartLine[] {
  return sanitizeCart(cart, b).map(item => {
    const product = b.products.find(p => p.id === item.productId)!;
    const variant = product.variants?.find(v => v.id === item.variantId);
    const unitCents = product.priceCents + (variant?.priceDeltaCents ?? 0);
    return {...item, key: cartKey(item), product, variant, unitCents, lineCents: product.pairPriceCents !== undefined ? Math.floor(item.quantity / 2) * product.pairPriceCents + (item.quantity % 2) * unitCents : unitCents * item.quantity};
  });
}
export function calculateTotals(lines: CartLine[], customer: Pick<Customer, 'mode' | 'zoneId'>, b: Business): OrderTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const deliveryCents = customer.mode === 'delivery' ? b.delivery.zones.find(z => z.id === customer.zoneId)?.feeCents ?? 0 : 0;
  return {subtotalCents, deliveryCents, totalCents: subtotalCents + deliveryCents};
}
export function changeQuantity(cart: CartItem[], item: Pick<CartItem, 'productId' | 'variantId'>, delta: number, b: Business) {
  const clean = sanitizeCart(cart, b);
  const key = cartKey(item);
  const existing = clean.find(i => cartKey(i) === key);
  const quantity = Math.max(0, Math.min((existing?.quantity ?? 0) + delta, b.order.maxQuantity));
  return sanitizeCart([...clean.filter(i => cartKey(i) !== key), ...(quantity ? [{...item, quantity}] : [])], b);
}
function minuteValue(value: string) { const [h, m] = value.split(':').map(Number); return h * 60 + m; }
export function isOpen(b: Business, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: b.hours.timeZone, weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(now);
  const pick = (kind: string) => parts.find(p => p.type === kind)?.value ?? '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days.indexOf(pick('weekday'));
  const minutes = Number(pick('hour')) * 60 + Number(pick('minute'));
  const today = b.hours.weekly[String(day)] ?? [];
  if (today.some(interval => {
    const start = minuteValue(interval.start), end = minuteValue(interval.end);
    return end > start ? minutes >= start && minutes < end : minutes >= start;
  })) return true;
  // Una franja 18:00–02:00 también cubre la madrugada del día siguiente.
  return (b.hours.weekly[String((day + 6) % 7)] ?? []).some(interval => {
    const start = minuteValue(interval.start), end = minuteValue(interval.end);
    return end < start && minutes < end;
  });
}
export function hoursText(b: Business) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days.map((day, i) => `${day}: ${(b.hours.weekly[String(i)] ?? []).map(s => `${s.start}–${s.end}`).join(', ') || 'cerrado'}`).join(' · ');
}
export function validateCustomer(customer: Customer, b: Business): Record<string, string> {
  const errors: Record<string, string> = {};
  if (customer.firstName.trim().length < 2) errors.firstName = 'Escribe tu nombre.';
  if (customer.lastName.trim().length < 2) errors.lastName = 'Escribe tu apellido.';
  if (customer.mode === 'delivery') {
    if (!b.delivery.enabled) errors.mode = 'El delivery no está disponible.';
    if (!b.delivery.zones.some(z => z.id === customer.zoneId)) errors.zoneId = 'Selecciona tu zona de entrega.';
    if (customer.address.trim().length < 6) errors.address = 'Escribe una dirección exacta para la entrega.';
  } else if (customer.mode === 'pickup') {
    if (!b.pickup.enabled) errors.mode = 'El retiro no está disponible.';
  } else errors.mode = 'Selecciona cómo recibir tu pedido.';
  if (customer.payment === 'cash' ? !b.payments.cash : customer.payment === 'transfer' ? !b.payments.transfer : true) errors.payment = 'Selecciona un método de pago disponible.';
  if (customer.gps) { try { gpsUrl(customer.gps); } catch { errors.gps = 'La ubicación no es válida. Puedes continuar con la dirección.'; } }
  for (const key of ['firstName', 'lastName', 'address', 'reference', 'notes'] as const) if (customer[key].length > (key === 'notes' ? 500 : 250)) errors[key] = 'El texto es demasiado largo.';
  return errors;
}
export function orderReference() {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0,8).toUpperCase() : Math.random().toString(36).slice(2,10).toUpperCase();
  return `AF-${suffix}`;
}
export function prepareOrder(cart: CartItem[], customer: Customer, b: Business, reference = orderReference(), now = new Date()): PreparedOrder {
  const errors = validateCustomer(customer, b);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const lines = cartLines(cart, b);
  if (!lines.length) throw new Error('Agrega al menos un producto.');
  if (b.hours.enforce && !b.demo && !isOpen(b, now)) throw new Error(b.hours.closedMessage);
  const totals = calculateTotals(lines, customer, b);
  const zone = b.delivery.zones.find(z => z.id === customer.zoneId);
  const text = (value: string) => value.trim().replace(/\r?\n/g, ' ');
  const message = [
    ...(b.demo ? ['🧪 PEDIDO DE DEMOSTRACIÓN · NO ES UNA VENTA REAL', ''] : []),
    `🍽️ ${b.name}`, `Referencia local: ${reference}`, `Cliente: ${text(customer.firstName)} ${text(customer.lastName)}`, '', 'PRODUCTOS',
    ...lines.map(line => `${line.quantity} × ${line.product.name}${line.variant ? ` (${line.variant.name})` : ''} · ${line.product.pairPriceCents !== undefined ? `promo 2 por ${money(line.product.pairPriceCents,b)} · ` : `${money(line.unitCents,b)} c/u = `}${money(line.lineCents,b)}${line.product.contents?.length ? `\n   Incluye: ${line.product.contents.join(', ')}` : ''}`),
    '', `Subtotal: ${money(totals.subtotalCents,b)}`,
    customer.mode === 'delivery' ? `Modalidad: Delivery\nZona: ${zone!.name}\nDelivery: ${money(totals.deliveryCents,b)}` : `Modalidad: Retiro en local\nDelivery: ${money(0,b)}`,
    `TOTAL: ${money(totals.totalCents,b)}`, '', 'ENTREGA',
    customer.mode === 'delivery' ? `Dirección: ${text(customer.address)}\nReferencia de dirección: ${text(customer.reference) || 'Sin referencia adicional'}\nGPS: ${customer.gps ? gpsUrl(customer.gps) : 'No compartido; usar dirección escrita'}` : `Local: ${b.location.address || 'Coordinar con el negocio'}\nInstrucciones: ${b.location.pickupInstructions || 'Coordinar retiro con el negocio'}`,
    '', customer.payment === 'cash' ? `Pago: Efectivo\nCobrar al entregar: ${money(totals.totalCents,b)}` : 'Pago: Transferencia\nPago pendiente de verificar\nCobrar al entregar: por definir con el negocio después de verificar el pago',
    `Observaciones: ${text(customer.notes) || 'Sin observaciones'}`,
  ].join('\n');
  return {reference, message, totals};
}
export function whatsappUrl(b: Business, message: string) {
  if (b.demo) throw new Error('La demostración no envía pedidos a un negocio real.');
  return `https://wa.me/${normalizePhone(b.whatsapp)}?text=${encodeURIComponent(message)}`;
}
