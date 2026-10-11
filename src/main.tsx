import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadBusiness } from './config';
import { App } from './App';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
root.render(<div className="loading"><span className="brand-mark">A</span><p>Preparando el menú…</p></div>);
loadBusiness().then(business => {
  document.title = `${business.name}${business.demo ? ' · Demostración' : ' · Pedidos'}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',business.description);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',business.theme.primary);
  document.documentElement.style.setProperty('--primary', business.theme.primary);
  document.documentElement.style.setProperty('--accent', business.theme.accent);
  document.documentElement.style.setProperty('--background', business.theme.background);
  root.render(<React.StrictMode><App business={business} /></React.StrictMode>);
  if (!window.__FOOD_STANDALONE__ && 'serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});
}).catch((error: unknown) => {
  root.render(<main className="loading"><h1>No pudimos abrir el menú</h1><p>{error instanceof Error ? error.message : 'Revisa la configuración del negocio.'}</p><button className="btn primary" onClick={() => location.reload()}>Volver a intentar</button></main>);
});
