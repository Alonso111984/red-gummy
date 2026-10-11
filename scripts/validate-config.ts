import fs from 'node:fs';
import path from 'node:path';
import { validateBusiness } from '../src/config';
const configPath=process.argv[2] ?? 'public/business.json';
const b=validateBusiness(JSON.parse(fs.readFileSync(configPath,'utf8')));
const root=path.dirname(configPath);
for(const asset of [b.hero.image,...b.products.map(p=>p.image),...(b.logo?[b.logo]:[])]) {
  if(!asset.startsWith('data:')&&!fs.existsSync(path.join(root,asset)))throw new Error(`Imagen ausente: ${asset}`);
}
console.log(`Configuración válida: ${b.name}, ${b.products.length} productos, ${b.delivery.zones.length} zonas. Modo: ${b.demo?'demo':'real'}.`);
