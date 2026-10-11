import fs from 'node:fs';
import path from 'node:path';
import {validateBusiness} from '../src/config';

const args=process.argv.slice(2);
const option=(name:string)=>{const index=args.indexOf('--'+name);return index>=0?args[index+1]:undefined;};
const id=option('id'),name=option('name'),output=option('out');
if(!id||!name||!output||!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id))throw new Error('Uso: npm run new-business -- --id negocio-demo --name "Mi negocio" --out ../mi-negocio');
const source=path.resolve('.'),target=path.resolve(output);
if(target===source||target.startsWith(source+path.sep))throw new Error('La nueva app debe estar fuera de la carpeta de la plantilla.');
if(fs.existsSync(target))throw new Error('El destino ya existe. Elige una carpeta nueva para proteger sus archivos.');
const configPath=option('config');
const b=validateBusiness(JSON.parse(fs.readFileSync(configPath??'public/business.json','utf8')));
b.id=id;b.name=name;b.revision='1';b.demo=true;b.whatsapp='';
validateBusiness(b);
fs.mkdirSync(target,{recursive:true});
for(const entry of fs.readdirSync(source)){
  if(['node_modules','dist','deliverables','.git','.openai'].includes(entry)||entry.endsWith('.zip')||entry.endsWith('.log'))continue;
  fs.cpSync(path.join(source,entry),path.join(target,entry),{recursive:true});
}
fs.writeFileSync(path.join(target,'public/business.json'),JSON.stringify(b,null,2)+'\n');
console.log(`Nueva app creada: ${name}. Permanece en modo demo hasta incorporar y verificar los datos reales. No se publicó.`);
