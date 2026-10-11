import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const configPath='public/business.json';
const b=JSON.parse(fs.readFileSync(configPath,'utf8'));
if(!b.demo||b.id!=='armaia-demo')throw new Error('Este comando solo prepara las imágenes sintéticas de la demostración.');
const files=[...new Set([b.hero.image,...b.products.map(p=>p.image)])];
fs.mkdirSync('demo-originals',{recursive:true});
let before=0,after=0;
for(const file of files){
  if(!file.endsWith('.png'))continue;
  const input=path.join('public',file),output=input.replace(/\.png$/,'.webp');
  const original=path.join('demo-originals',path.basename(file));
  before+=fs.statSync(input).size;
  fs.copyFileSync(input,original);
  // Codificación WebP para web; sin recorte, cambio de fondo ni alteración de la composición.
  await sharp(input).webp({quality:88,effort:5}).toFile(output);
  after+=fs.statSync(output).size;
  if(b.hero.image===file)b.hero.image=file.replace(/\.png$/,'.webp');
  for(const p of b.products)if(p.image===file)p.image=file.replace(/\.png$/,'.webp');
  fs.unlinkSync(input);
}
fs.writeFileSync(configPath,JSON.stringify(b,null,2)+'\n');
console.log(`Imágenes listas: ${Math.round(before/1024)} KB originales → ${Math.round(after/1024)} KB para la web. Originales conservados.`);
