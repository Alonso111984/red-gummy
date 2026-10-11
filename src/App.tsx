import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChefHat, ChevronRight, Clock3, Copy, Leaf, MapPin, MessageCircle, Minus, Navigation, Plus, Search, ShoppingBag, Truck, Wallet, X, Smartphone, Info, PackageCheck } from 'lucide-react';
import type { Business, CartItem, CartLine, Customer, PreparedOrder, Product } from './types';
import { calculateTotals, cartKey, cartLines, changeQuantity, gpsUrl, hoursText, isOpen, money, prepareOrder, safeMapUrl, sanitizeCart, validateCustomer, whatsappUrl } from './engine';

const storageKey = (b: Business) => `armaia-food:${b.id}:cart-v1`;
function readCart(b: Business): CartItem[] {
  try { return sanitizeCart(JSON.parse(localStorage.getItem(storageKey(b)) ?? '[]'), b); } catch { return []; }
}
function imageSource(path: string) { return path.startsWith('data:') ? path : `${import.meta.env?.BASE_URL ?? './'}${path}`; }
function FoodImage({src, alt, eager = false}: {src:string; alt:string; eager?:boolean}) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="image-fallback"><ChefHat size={32}/><span>Imagen no disponible</span></div> : <img src={imageSource(src)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}
function Quantity({quantity, plus, minus, label, disabled, max}: {quantity:number; plus:()=>void; minus:()=>void; label:string; disabled?:boolean; max:number}) {
  return <div className={`quantity ${quantity ? 'has-items' : ''}`}>
    <button type="button" onClick={minus} disabled={disabled || !quantity} aria-label={`Quitar uno: ${label}`}><Minus size={16}/></button>
    <span aria-label={`${quantity} unidades de ${label}`}>{quantity}</span>
    <button type="button" className="plus" onClick={plus} disabled={disabled || quantity >= max} aria-label={`Agregar uno: ${label}`}><Plus size={17}/></button>
  </div>;
}
function ProductCard({product:p, business:b, cart, update}: {product:Product; business:Business; cart:CartItem[]; update:(item:Pick<CartItem,'productId'|'variantId'>,delta:number)=>void}) {
  const [variantId, setVariantId] = useState(p.variants?.find(v => v.available)?.id);
  const variant = p.variants?.find(v => v.id === variantId);
  const item = {productId:p.id, ...(variantId ? {variantId} : {})};
  const quantity = cart.find(i => cartKey(i) === cartKey(item))?.quantity ?? 0;
  return <article className={`product-card ${!p.available ? 'sold-out' : ''}`}>
    <div className="product-photo"><FoodImage src={p.image} alt={b.demo ? `Imagen ilustrativa de demostración: ${p.name}` : p.name}/>{p.badge && <span className={`product-badge ${!p.available ? 'muted' : ''}`}>{p.badge}</span>}{b.demo && <span className="demo-photo">Foto ilustrativa</span>}</div>
    <div className="product-body"><h3>{p.name}</h3><p>{p.description}</p>{p.contents && <div className="combo-contents"><PackageCheck size={14}/><span>{p.contents.join(' · ')}</span></div>}
      {p.variants?.length ? <label className="variant-label">Elige tu opción<select aria-label={`Opción de ${p.name}`} value={variantId} onChange={e => setVariantId(e.target.value)} disabled={!p.available}>{p.variants.map(v => <option key={v.id} value={v.id} disabled={!v.available}>{v.name}{v.priceDeltaCents ? ` (${v.priceDeltaCents > 0 ? '+' : '−'}${money(Math.abs(v.priceDeltaCents),b)})` : ''}{!v.available ? ' · agotada' : ''}</option>)}</select></label> : null}
      <div className="product-bottom"><strong>{money(p.priceCents + (variant?.priceDeltaCents ?? 0),b)}<small>{p.pairPriceCents !== undefined ? `2 por ${money(p.pairPriceCents,b)}` : p.contents ? 'el combo' : 'por unidad'}</small></strong>{p.available ? quantity > 0 ? <div className="product-selection"><span>En tu pedido</span><Quantity quantity={quantity} label={`${p.name}${variant ? ` ${variant.name}` : ''}`} max={b.order.maxQuantity} plus={() => update(item,1)} minus={() => update(item,-1)}/></div> : <button className="add-to-order" type="button" onClick={() => update(item,1)} aria-label={`Agregar uno: ${p.name}${variant ? ` ${variant.name}` : ''}`}><span>Agregar al pedido</span><Plus size={19}/></button> : <span className="unavailable">Agotado</span>}</div>
    </div>
  </article>;
}

export function App({business:b}: {business:Business}) {
  const [cart, setCart] = useState<CartItem[]>(() => readCart(b));
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(navigator.onLine && !window.__FOOD_OFFLINE_CONFIG__);
  const [storageWarning, setStorageWarning] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<(Event & {prompt:()=>Promise<void>; userChoice:Promise<{outcome:string}>}) | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const lines = useMemo(() => cartLines(cart,b),[cart,b]);
  const count = lines.reduce((s,l) => s+l.quantity,0);
  const subtotal = lines.reduce((s,l) => s+l.lineCents,0);
  const open = isOpen(b,now);
  const blocked = !b.demo && b.hours.enforce && !open;
  useEffect(() => { try { localStorage.setItem(storageKey(b),JSON.stringify(cart)); } catch { setStorageWarning(true); } },[cart,b]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()),30_000);
    const status = () => setOnline(navigator.onLine && !window.__FOOD_OFFLINE_CONFIG__);
    const install = (e: Event) => { e.preventDefault(); setInstallPrompt(e as typeof installPrompt); };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('online',status); window.addEventListener('offline',status); window.addEventListener('beforeinstallprompt',install); window.addEventListener('appinstalled',installed);
    return () => {clearInterval(timer); window.removeEventListener('online',status); window.removeEventListener('offline',status); window.removeEventListener('beforeinstallprompt',install); window.removeEventListener('appinstalled',installed);};
  },[]);
  const update = (item: Pick<CartItem,'productId'|'variantId'>, delta:number) => {
    setCart(prev => changeQuantity(prev,item,delta,b));
    setAnnouncement(`${delta > 0 ? 'Agregado' : 'Actualizado'}: ${b.products.find(p => p.id === item.productId)?.name ?? 'producto'}`);
  };
  const normalize = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visible = b.products.filter(p => (category==='all' || p.categoryId===category) && (!onlyAvailable || p.available) && normalize(`${p.name} ${p.description}`).includes(normalize(search)));
  const map = safeMapUrl(b.location.mapUrl);
  const heroProduct = b.products.find(p => p.featured && p.available) ?? b.products.find(p => p.available);
  const heroVariant = heroProduct?.variants?.find(v => v.available);
  const heroItem = heroProduct ? {productId:heroProduct.id, ...(heroVariant ? {variantId:heroVariant.id} : {})} : null;
  return <>
    <a className="skip-link" href="#menu">Ir al menú</a>
    {b.demo && <div className="demo-banner"><span><Info size={14}/> ARMAIA Food Studio · Real Object + UI · Demo 2</span><span>Imágenes y datos ilustrativos. Sin pedidos reales.</span></div>}
    {!online && <div className="notice error" role="status">Catálogo guardado sin conexión. Conéctate a internet y recarga el menú para actualizar precios antes de preparar un pedido real.</div>}
    <header className="site-header"><a className="brand" href="#" aria-label={`${b.name}, inicio`}>{b.logo ? <img className="brand-logo" src={imageSource(b.logo)} alt={`Logo de ${b.name}`}/> : <span className="brand-mark"><ChefHat size={25}/></span>}<span><strong>{b.name}</strong><small>{b.tagline}</small></span></a>
      <div className="header-actions"><span className="delivery-pill"><Truck size={17}/>{b.delivery.enabled ? 'Delivery disponible' : 'Retiro en local'}</span><button className="icon-button cart-top" onClick={() => setCheckout(true)} aria-label={`Abrir pedido, ${count} unidades`}><ShoppingBag size={21}/>{count>0 && <span>{count}</span>}</button></div>
    </header>
    <main>
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><span className="eyebrow"><span/> DULCE. FRÍO. PICANTE.</span><h1 id="hero-title">{b.hero.title}</h1><p>{b.hero.subtitle}</p><div className="hero-actions"><a className="btn primary" href="#menu">Elige tu antojo <ArrowDown size={18}/></a></div><button className="text-button hero-hours" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} aria-controls="business-details"><Clock3 size={16}/> Horarios y delivery <ChevronRight size={14}/></button></div>
        <div className="hero-visual"><div className="hero-picture"><FoodImage src={b.hero.image} alt={b.demo ? 'Corviche clásico · fotografía generada para esta demostración' : b.hero.title.replace('\n',' ')} eager/></div>{heroProduct&&heroItem&&<div className="hero-product"><div><span className="eyebrow">EL FRÍO QUE PRENDE</span><h2>{heroProduct.name}</h2><p>{heroVariant?.name ?? (heroProduct.contents?'Combo':'Por unidad')}<strong>{money(heroProduct.priceCents+(heroVariant?.priceDeltaCents??0),b)}</strong></p></div><button type="button" className="hero-quick" onClick={()=>update(heroItem,1)} disabled={(cart.find(i=>cartKey(i)===cartKey(heroItem))?.quantity??0)>=b.order.maxQuantity} aria-label={`Agregar favorito al pedido: ${heroProduct.name}`}><span>Lo quiero</span><Plus size={21}/></button></div>}<div className="hero-caption">{b.demo ? 'Imagen ilustrativa de demostración' : 'El sabor empieza aquí.'}</div></div>
      </section>
      <section className="service-strip" aria-label="Información del negocio"><button onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} aria-controls="business-details"><span className={`status-dot ${open?'open':''}`}/><strong>{open?'En horario de atención':'Fuera de horario'}</strong><span>Lun–Sáb · 08:00–20:00</span><ChevronRight size={16}/></button><span><Truck size={18}/>{b.delivery.enabled ? `Santa Elena · delivery gratis` : 'Sin delivery'}</span><span><Wallet size={18}/>{[b.payments.cash?'Efectivo':'',b.payments.transfer?'Transferencia':''].filter(Boolean).join(' o ')}</span></section>
      {detailsOpen && <section className="business-details" id="business-details"><div><h2><Clock3 size={18}/> Horarios</h2><p>{hoursText(b)}</p><small>Zona horaria: {b.hours.timeZone}{b.demo ? ' · ejemplo configurable' : ''}</small></div><div><h2><Truck size={18}/> Delivery</h2>{b.delivery.zones.map(z=><p key={z.id}>{z.name} · {z.feeCents ? money(z.feeCents,b) : 'GRATIS'}</p>)}</div></section>}
      {!open && !blocked && <p className="notice" role="status">{b.hours.closedMessage} Puedes preparar tu solicitud; el negocio la atenderá en su horario.</p>}
      {blocked && <p className="notice" role="status">{b.hours.closedMessage}</p>}
      <section className="menu-section" id="menu"><div className="section-heading"><div><span className="eyebrow">TU PRÓXIMO ANTOJO ESTÁ AQUÍ</span><h2>Elige. Pide. Disfruta<span>.</span></h2><p>{b.description}</p></div><span className="menu-count">{b.products.length} opciones para elegir</span></div>
        <div className="menu-tools"><nav className="category-tabs" aria-label="Categorías"><button className={category==='all'?'active':''} onClick={() => setCategory('all')} aria-pressed={category==='all'}>Todo el menú</button>{b.categories.map(c => <button key={c.id} className={category===c.id?'active':''} onClick={() => setCategory(c.id)} aria-pressed={category===c.id}>{c.name}</button>)}</nav><label className="search-box"><Search size={17}/><input type="search" placeholder="¿Qué se te antoja?" aria-label="Buscar productos" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
        <div className="filter-row"><label><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)}/> Mostrar solo disponibles</label><span>{visible.length} {visible.length===1?'opción':'opciones'}</span></div>
        <div className="product-grid">{visible.map(p => <ProductCard key={p.id} product={p} business={b} cart={cart} update={update}/>)}</div>
        {!visible.length && <div className="empty-state"><Search size={30}/><h3>No encontramos ese antojo</h3><p>Prueba con otro nombre o revisa todas las categorías.</p><button className="btn secondary" onClick={()=>{setCategory('all');setSearch('');setOnlyAvailable(false);}}>Ver todo el menú</button></div>}
      </section>
      <section className="how-to"><span className="brand-mark small"><ShoppingBag size={20}/></span><div><h2>Tu pedido, sin complicaciones.</h2><p>Elige tus favoritos, completa la entrega y envía el mensaje en WhatsApp.</p></div><span>1. Elige <ChevronRight size={14}/> 2. Revisa <ChevronRight size={14}/> 3. Envía</span></section>
      {storageWarning && <p className="notice">Tu navegador no permite guardar el carrito. Puedes pedir en esta sesión.</p>}
    </main>
    <footer><span>{b.name} · Sabor que te prende 🔥</span><span>Creado con <strong>ARMAIA Food Studio</strong></span>{installPrompt && <button className="text-button" onClick={async()=>{await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null);}}><Smartphone size={16}/> Instalar app</button>}</footer>
    <div className="sr-only" aria-live="polite">{announcement}</div>
    {count > 0 && <div className="cart-dock"><div className="dock-inner"><span className="dock-icon"><ShoppingBag size={21}/><b>{count}</b></span><div className="dock-total"><small>Tu pedido · {count} {count===1?'unidad':'unidades'}</small><strong>{money(subtotal,b)}<span> + delivery</span></strong></div><button className="btn primary" onClick={()=>setCheckout(true)}>{b.order.cta}<ArrowRight size={18}/></button></div></div>}
    {checkout && <Checkout business={b} cart={cart} lines={lines} update={update} close={()=>setCheckout(false)} online={online}/>}
  </>;
}

function Checkout({business:b, cart, lines, update, close, online}: {business:Business; cart:CartItem[]; lines:CartLine[]; update:(item:Pick<CartItem,'productId'|'variantId'>,delta:number)=>void; close:()=>void; online:boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [customer, setCustomer] = useState<Customer>({firstName:'',lastName:'',mode:b.delivery.enabled?'delivery':'pickup',zoneId:'',address:'',reference:'',notes:'',payment:b.payments.cash?'cash':'transfer',gps:null});
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [prepared, setPrepared] = useState<PreparedOrder | null>(null);
  const [gpsStatus, setGpsStatus] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [sendError, setSendError] = useState('');
  const gpsRequest = useRef(0);
  const totals = calculateTotals(lines,customer,b);
  useEffect(()=>{
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    const previousOverflow = document.body.style.overflow; document.body.style.overflow='hidden';
    return ()=> {gpsRequest.current++; document.body.style.overflow=previousOverflow; previouslyFocused?.focus();};
  },[]);
  const set = <K extends keyof Customer>(key:K,value:Customer[K]) => {setCustomer(prev=>({...prev,[key]:value}));setErrors(prev=>{const next={...prev};delete next[key];return next;});setPrepared(null);};
  const shareGps = () => {
    setGpsStatus('');
    if (!window.isSecureContext || !navigator.geolocation) {setGpsStatus('GPS no disponible aquí. Continúa con tu dirección escrita.');return;}
    const request=++gpsRequest.current; setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(position=>{
      if(request!==gpsRequest.current)return;
      const gps={latitude:position.coords.latitude,longitude:position.coords.longitude};
      try {gpsUrl(gps); set('gps',gps); setGpsStatus('Ubicación añadida al pedido.');} catch {setGpsStatus('No se pudo validar la ubicación. Usa tu dirección escrita.');}
      setGpsBusy(false);
    },error=>{
      if(request!==gpsRequest.current)return;
      setGpsBusy(false);setGpsStatus(error.code===1?'Permiso denegado. Puedes continuar con tu dirección escrita.':error.code===3?'La ubicación tardó demasiado. Usa tu dirección escrita o vuelve a intentarlo.':'No pudimos obtener tu ubicación. Usa tu dirección escrita.');
    },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  };
  const removeGps=()=>{gpsRequest.current++;setGpsBusy(false);set('gps',null);setGpsStatus('Ubicación eliminada del pedido.');};
  const review=(event:React.FormEvent)=>{
    event.preventDefault(); const problems=validateCustomer(customer,b);setErrors(problems);
    if(Object.keys(problems).length) {window.setTimeout(()=>dialog.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),0);return;}
    try {if(!online&&!b.demo)throw new Error('Conéctate a internet antes de continuar.');setPrepared(prepareOrder(cart,customer,b));setSendError('');setCopyStatus('');dialog.current?.querySelector('.checkout-scroll')?.scrollTo({top:0});}catch(e){setSendError(e instanceof Error?e.message:'No se pudo preparar el pedido.');}
  };
  const copy=async()=>{
    if(!prepared)return;
    try {if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(prepared.message);setCopyStatus('Mensaje copiado. Todavía no se ha enviado.');}
    catch {const textArea=dialog.current?.querySelector<HTMLTextAreaElement>('.message-preview');textArea?.focus();textArea?.select();setCopyStatus('Selecciona el mensaje y cópialo manualmente.');}
  };
  let link=''; if(prepared&&!b.demo){try{link=whatsappUrl(b,prepared.message);}catch{}}
  const beforeSend=(event:React.MouseEvent<HTMLAnchorElement>)=>{
    try {if(!navigator.onLine || window.__FOOD_OFFLINE_CONFIG__)throw new Error('Conéctate a internet y recarga el menú antes de abrir WhatsApp.');const fresh=prepareOrder(cart,customer,b,prepared!.reference);if(fresh.message!==prepared!.message)throw new Error('El pedido cambió. Revisa de nuevo el resumen.');setSendError('');}
    catch(e){event.preventDefault();setSendError(e instanceof Error?e.message:'No se pudo abrir WhatsApp.');}
  };
  const field=(key:'firstName'|'lastName'|'address'|'reference',label:string,placeholder:string,required=false)=> <label className="field">{label}{required&&<span> *</span>}<input name={key} autoComplete={key==='firstName'?'given-name':key==='lastName'?'family-name':key==='address'?'street-address':'off'} value={customer[key]} placeholder={placeholder} maxLength={250} onChange={e=>set(key,e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key]?`error-${key}`:undefined}/>{errors[key]&&<small className="field-error" id={`error-${key}`}>{errors[key]}</small>}</label>;
  return <dialog ref={dialog} className="checkout-dialog" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}} aria-labelledby="checkout-title">
    <div className="checkout-header"><div><span className="eyebrow">{prepared?'REVISA ANTES DE ENVIAR':'UN PASO MÁS PARA DISFRUTAR'}</span><h2 id="checkout-title">{prepared?'Tu pedido está listo':'Tu pedido'}<span>.</span></h2></div><button className="icon-button" onClick={close} aria-label="Cerrar pedido"><X size={23}/></button></div>
    <div className="checkout-scroll">
      {!lines.length ? <div className="empty-state"><ShoppingBag size={40}/><h3>Tu carrito está vacío</h3><p>Elige algo rico del menú para comenzar.</p><button className="btn primary" onClick={close}>Volver al menú</button></div> : prepared ? <>
        <button className="text-button back-button" onClick={()=>{setPrepared(null);setSendError('');}}><ArrowLeft size={16}/> Editar pedido y entrega</button>
        <div className="review-note"><Check size={19}/><div><strong>{b.demo?'Mensaje de prueba preparado':'Mensaje preparado'}</strong><p>{b.demo?'Esta demostración no envía pedidos reales.':'Al abrir WhatsApp, pulsa Enviar para completar tu solicitud.'}</p></div></div>
        <label className="field message-label">Mensaje para el negocio<textarea className="message-preview" readOnly value={prepared.message} rows={21}/></label>
        <div className="review-total"><span>Total del pedido</span><strong>{money(prepared.totals.totalCents,b)}</strong></div>
        {sendError&&<p className="notice error" role="alert">{sendError}</p>}
        {b.demo ? <button className="btn primary full-width" onClick={copy}><Copy size={18}/> Copiar pedido de prueba</button> : <a className="btn whatsapp full-width" href={link} target="_blank" rel="noopener noreferrer" onClick={beforeSend}><MessageCircle size={19}/> Abrir WhatsApp y enviar</a>}
        {!b.demo&&<button className="text-button copy-alternative" onClick={copy}><Copy size={15}/> Copiar mensaje</button>}
        {copyStatus&&<p className="inline-status" role="status">{copyStatus}</p>}
        <p className="privacy-note">El pedido aún no está confirmado. El negocio confirma disponibilidad, entrega y pago por WhatsApp.</p>
      </> : <form onSubmit={review} noValidate>
        <div className="order-lines">{lines.map(line=><div className="order-line" key={line.key}><div className="line-image"><FoodImage src={line.product.image} alt=""/></div><div className="line-description"><strong>{line.product.name}</strong><small>{line.variant?.name || (line.product.contents?'Combo':'Por unidad')}</small><Quantity quantity={line.quantity} label={`${line.product.name} ${line.variant?.name??''}`} max={b.order.maxQuantity} plus={()=>update(line,1)} minus={()=>update(line,-1)}/></div><strong className="line-price">{money(line.lineCents,b)}</strong></div>)}</div>
        <section className="checkout-section"><h3><Truck size={19}/> ¿Cómo lo recibes?</h3><div className="choice-row">{b.delivery.enabled&&<label className={`choice ${customer.mode==='delivery'?'selected':''}`}><input type="radio" name="mode" value="delivery" checked={customer.mode==='delivery'} onChange={()=>set('mode','delivery')}/><Truck size={20}/><strong>Delivery</strong><small>Hasta tu dirección</small></label>}{b.pickup.enabled&&<label className={`choice ${customer.mode==='pickup'?'selected':''}`}><input type="radio" name="mode" value="pickup" checked={customer.mode==='pickup'} onChange={()=>{gpsRequest.current++;setGpsBusy(false);set('mode','pickup');}}/><ShoppingBag size={20}/><strong>Retiro en local</strong><small>Sin costo de envío</small></label>}</div>{errors.mode&&<p className="field-error">{errors.mode}</p>}</section>
        <section className="checkout-section"><h3><MapPin size={19}/> Datos de {customer.mode==='delivery'?'entrega':'retiro'}</h3><div className="fields-pair">{field('firstName','Nombre','Tu nombre',true)}{field('lastName','Apellido','Tu apellido',true)}</div>
          {customer.mode==='delivery'?<><label className="field">Zona de envío <span>*</span><select value={customer.zoneId} onChange={e=>set('zoneId',e.target.value)} aria-invalid={!!errors.zoneId} aria-describedby={errors.zoneId?'error-zone':undefined}><option value="">Selecciona tu zona</option>{b.delivery.zones.map(z=><option key={z.id} value={z.id}>{z.name} · {z.feeCents ? money(z.feeCents,b) : 'GRATIS'}</option>)}</select>{errors.zoneId&&<small className="field-error" id="error-zone">{errors.zoneId}</small>}</label>{field('address','Dirección exacta','Calle, número de casa, sector…',true)}{field('reference','Referencia de dirección','Ej.: casa blanca junto al parque')}
            <div className="gps-section"><button className="btn secondary full-width" type="button" onClick={shareGps} disabled={gpsBusy}><Navigation size={17}/>{gpsBusy?'Buscando ubicación…':customer.gps?'Actualizar ubicación GPS':'Ayuda al motorizado · Compartir GPS'}</button><small>Opcional. Solo se incluirá en el mensaje si autorizas el permiso del navegador.</small>{customer.gps&&<div className="gps-result"><a href={gpsUrl(customer.gps)} target="_blank" rel="noopener noreferrer"><MapPin size={14}/> Ver ubicación añadida</a><button type="button" className="text-button" onClick={removeGps}>Quitar</button></div>}{gpsStatus&&<p className="inline-status" role="status">{gpsStatus}</p>}</div>
          </>:<div className="pickup-info"><strong>{b.location.address}</strong><p>{b.location.pickupInstructions}</p>{safeMapUrl(b.location.mapUrl)&&<a href={safeMapUrl(b.location.mapUrl)!} target="_blank" rel="noopener noreferrer">Ver mapa</a>}</div>}
        </section>
        <section className="checkout-section"><h3><Wallet size={19}/> ¿Cómo pagas?</h3><div className="choice-row">{b.payments.cash&&<label className={`choice ${customer.payment==='cash'?'selected':''}`}><input type="radio" name="payment" checked={customer.payment==='cash'} onChange={()=>set('payment','cash')}/><Wallet size={20}/><strong>Efectivo</strong><small>Pagas al recibir</small></label>}{b.payments.transfer&&<label className={`choice ${customer.payment==='transfer'?'selected':''}`}><input type="radio" name="payment" checked={customer.payment==='transfer'} onChange={()=>set('payment','transfer')}/><Smartphone size={20}/><strong>Transferencia</strong><small>El negocio verifica</small></label>}</div>{errors.payment&&<p className="field-error">{errors.payment}</p>}
          {customer.payment==='transfer'&&b.payments.bank&&<div className="bank-details"><strong>{b.payments.bank.name}</strong><dl><dt>Cuenta</dt><dd>{b.payments.bank.accountType} · {b.payments.bank.account}</dd><dt>Titular</dt><dd>{b.payments.bank.holder}</dd></dl><p>{b.payments.bank.instructions}</p><span>Pago pendiente de verificar</span></div>}
        </section>
        <label className="field">Observaciones <small>(opcional)</small><textarea value={customer.notes} onChange={e=>set('notes',e.target.value)} placeholder="Algo que debamos saber sobre tu pedido…" rows={2} maxLength={500}/></label>
        <div className="totals"><div><span>Subtotal</span><strong>{money(totals.subtotalCents,b)}</strong></div><div><span>{customer.mode==='delivery'?'Delivery':'Retiro en local'}</span><span>{customer.mode==='delivery'&&!customer.zoneId?'Elige tu zona':money(totals.deliveryCents,b)}</span></div><div className="grand-total"><strong>Total{customer.mode==='delivery'&&!customer.zoneId?' parcial':''}</strong><strong>{money(totals.totalCents,b)}</strong></div></div>
        {sendError&&<p className="notice error" role="alert">{sendError}</p>}
        <button type="submit" className="btn primary full-width" disabled={!online&&!b.demo}>Revisar pedido <ArrowRight size={18}/></button><p className="privacy-note">Tus datos se usan para preparar el mensaje. No guardamos tu dirección ni tu GPS en este navegador.</p>
      </form>}
    </div>
  </dialog>;
}
