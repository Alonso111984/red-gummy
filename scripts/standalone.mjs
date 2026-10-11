import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/prepare-pwa.mjs'],{stdio:'inherit'});
const config=JSON.parse(fs.readFileSync('public/business.json','utf8'));
let html=fs.readFileSync('dist/index.html','utf8');
const codePath=html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
if(!codePath)throw new Error('Bundle no encontrado.');
const js=fs.readFileSync(path.join('dist',codePath.replace(/^\.\//,'')),'utf8');
const paths=new Set([config.hero.image,...config.products.map(p=>p.image),...(config.logo?[config.logo]:[])]);
const assets={};
for(const p of paths) {if(p.startsWith('data:'))continue;const type=p.endsWith('.png')?'image/png':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.webp')?'image/webp':'image/jpeg';assets[p]=`data:${type};base64,${fs.readFileSync(path.join('public',p)).toString('base64')}`;}
// El archivo independiente es SIEMPRE demo; no puede apuntar por accidente al WhatsApp real de un cliente.
config.demo=true;config.whatsapp='';
const safe=v=>JSON.stringify(v).replace(/</g,'\\u003c');
const bootstrap=`window.__FOOD_STANDALONE__=true;window.__FOOD_CONFIG__=${safe(config)};const foodAssets=${safe(assets)};window.__FOOD_CONFIG__.hero.image=foodAssets[window.__FOOD_CONFIG__.hero.image]||window.__FOOD_CONFIG__.hero.image;for(const p of window.__FOOD_CONFIG__.products)p.image=foodAssets[p.image]||p.image;if(window.__FOOD_CONFIG__.logo)window.__FOOD_CONFIG__.logo=foodAssets[window.__FOOD_CONFIG__.logo]||window.__FOOD_CONFIG__.logo;`;
html=html.replace(/<link rel="manifest"[^>]+>/,'').replace(/<link rel="icon"[^>]+>/,'');
html=html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,href)=>`<style>${fs.readFileSync(path.join('dist',href.replace(/^\.\//,'')),'utf8')}</style>`);
html=html.replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,()=>`<script>${bootstrap}</script><script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
fs.mkdirSync('deliverables',{recursive:true});
fs.writeFileSync('deliverables/ARMAIA-Food-Studio-Demo.html',html);
console.log('Demostración independiente creada.');
