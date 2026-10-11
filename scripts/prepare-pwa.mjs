import fs from 'node:fs';
import path from 'node:path';
const b=JSON.parse(fs.readFileSync('public/business.json','utf8'));
const title=b.name+(b.demo?' · Demo':'');
fs.writeFileSync('public/manifest.webmanifest',JSON.stringify({id:`./?business=${b.id}`,name:title,short_name:b.name.slice(0,22),description:b.description,start_url:'./',scope:'./',display:'standalone',background_color:b.theme.background,theme_color:b.theme.primary,lang:'es',icons:[{src:'./images/logo-red.png',sizes:'1080x1080',type:'image/png',purpose:'any'}]},null,2));
// El logo original del cliente no se altera. Los iconos genéricos solo identifican la app de demostración.
const visit=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?visit(path.join(dir,e.name)):[path.join(dir,e.name).replaceAll('\\','/')]);
const usedImages=new Set([b.hero.image,...b.products.map(p=>p.image),...(b.logo?[b.logo]:[])]);
// No publicar fotos antiguas sin referencias ni precargarlas en la PWA.
if(fs.existsSync('dist/images'))for(const file of visit('dist/images'))if(!usedImages.has(file.slice(5)))fs.unlinkSync(file);
const assets=visit('dist').filter(p=>!p.endsWith('sw.js')).map(p=>'./'+p.slice(5));
const cache=JSON.stringify(`armaia-food-${b.id}-${b.revision}-${Date.now()}`);
const source=`const CACHE=${cache};\nconst ASSETS=${JSON.stringify(assets)};\nself.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});\nself.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('armaia-food-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});\nself.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;const config=url.pathname.endsWith('/business.json');event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;}).catch(async()=>{const cached=await caches.match(event.request);if(!cached)return new Response('Sin conexión',{status:503});if(!config)return cached;const headers=new Headers(cached.headers);headers.set('X-Food-Offline','1');return new Response(await cached.text(),{status:200,headers});}));});\n`;
fs.writeFileSync('dist/sw.js',source);
fs.copyFileSync('public/manifest.webmanifest','dist/manifest.webmanifest');
console.log('PWA configurada y recursos locales preparados.');
