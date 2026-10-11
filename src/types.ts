export type Variant = { id: string; name: string; priceDeltaCents: number; available: boolean };
export type Product = {
  id: string; categoryId: string; name: string; description: string;
  priceCents: number; pairPriceCents?: number; image: string; available: boolean; featured?: boolean;
  badge?: string; variants?: Variant[]; contents?: string[];
};
export type TimeInterval = { start: string; end: string };
export type Business = {
  schemaVersion: 1; id: string; revision: string; demo: boolean;
  visualStyle?: 'real-object-ui';
  name: string; tagline: string; description: string; logo: string | null;
  whatsapp: string; currency: 'USD'; locale: string;
  theme: { primary: string; accent: string; background: string };
  hero: { title: string; subtitle: string; image: string };
  location: { address: string; mapUrl: string | null; pickupInstructions: string };
  hours: { timeZone: string; enforce: boolean; closedMessage: string; weekly: Record<string, TimeInterval[]> };
  delivery: { enabled: boolean; zones: { id: string; name: string; feeCents: number }[] };
  pickup: { enabled: boolean };
  payments: { cash: boolean; transfer: boolean; bank: { name: string; accountType: string; account: string; holder: string; instructions: string } | null };
  categories: { id: string; name: string }[];
  products: Product[];
  order: { cta: string; maxQuantity: number };
};
export type CartItem = { productId: string; variantId?: string; quantity: number };
export type CartLine = CartItem & { key: string; product: Product; variant?: Variant; unitCents: number; lineCents: number };
export type Coordinates = { latitude: number; longitude: number };
export type Customer = {
  firstName: string; lastName: string; mode: 'delivery' | 'pickup'; zoneId: string;
  address: string; reference: string; notes: string; payment: 'cash' | 'transfer';
  gps: Coordinates | null;
};
export type OrderTotals = { subtotalCents: number; deliveryCents: number; totalCents: number };
export type PreparedOrder = { reference: string; message: string; totals: OrderTotals };
