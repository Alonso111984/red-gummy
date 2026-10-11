import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateBusiness} from '../src/config';
import {cartLines,calculateTotals,prepareOrder,whatsappUrl,validateCustomer,isOpen,money} from '../src/engine';
import type {Customer} from '../src/types';
const b=validateBusiness(JSON.parse(fs.readFileSync('public/business.json','utf8')));
const customer:Customer={firstName:'Ana',lastName:'Pérez',mode:'delivery',zoneId:'santa-elena',address:'Calle 10, casa 15',reference:'Puerta roja',notes:'Llamar al llegar',payment:'cash',gps:null};
test('Red Gummy aplica la promoción de gomitas a pares y a unidades impares',()=>{
 for(let quantity=1;quantity<=30;quantity++){
  const lines=cartLines([{productId:'gomitas-enchiladas',quantity}],b);
  assert.equal(lines[0].lineCents,Math.floor(quantity/2)*500+(quantity%2)*300);
 }
});
test('Red Gummy: 2 gomitas + frozen + mango cuestan 9.50 más la tarifa exacta',()=>{
 const cart=[{productId:'gomitas-enchiladas',quantity:2},{productId:'pulp-mango',quantity:1},{productId:'mango-enchilado',quantity:1}];
 for(const [zoneId,fee] of [['santa-elena',0],['la-libertad',150],['salinas',250]] as const){
  const c={...customer,zoneId};
  const order=prepareOrder(cart,c,b,'RG-TEST');
  assert.deepEqual(order.totals,{subtotalCents:950,deliveryCents:fee,totalCents:950+fee});
  assert.ok(order.message.includes('Cobrar al entregar: '+money(950+fee,b)));
  const url=new URL(whatsappUrl(b,order.message));
  assert.equal(url.pathname,'/593993504478');
  assert.equal(url.searchParams.get('text'),order.message);
 }
});
test('Red Gummy: promoción no indica un precio unitario incompatible con el importe',()=>{
 const order=prepareOrder([{productId:'gomitas-enchiladas',quantity:3}],customer,b,'RG-TEST');
 assert.equal(order.totals.totalCents,800);
 assert.ok(order.message.includes('3 × Gomitas enchiladas · promo 2 por '+money(500,b)+' · '+money(800,b)));
});
test('Red Gummy: únicamente delivery y efectivo; exige zona y dirección',()=>{
 assert.equal(b.pickup.enabled,false);assert.equal(b.payments.transfer,false);
 assert.ok(validateCustomer({...customer,mode:'pickup'},b).mode);
 assert.ok(validateCustomer({...customer,payment:'transfer'},b).payment);
 assert.ok(validateCustomer({...customer,zoneId:'',address:''},b).zoneId);
});
test('Red Gummy: GPS es voluntario y el mensaje conserva datos completos',()=>{
 const order=prepareOrder([{productId:'pulp-durazno',quantity:1}],{...customer,gps:{latitude:-2.23,longitude:-80.85}},b,'RG-TEST');
 for(const part of ['Ana Pérez','Pulp de durazno','Santa Elena','Calle 10, casa 15','Puerta roja','Pago: Efectivo','Llamar al llegar','https://www.google.com/maps?q=-2.230000,-80.850000']) assert.ok(order.message.includes(part),part);
 assert.ok(prepareOrder([{productId:'pulp-durazno',quantity:1}],customer,b).message.includes('No compartido; usar dirección escrita'));
});
test('Red Gummy muestra el horario de Ecuador y permite solicitar fuera de horario sin prometer atención inmediata',()=>{
 assert.equal(isOpen(b,new Date('2026-10-10T12:59:00Z')),false);
 assert.equal(isOpen(b,new Date('2026-10-10T13:00:00Z')),true);
 assert.equal(isOpen(b,new Date('2026-10-11T01:00:00Z')),false);
 assert.equal(isOpen(b,new Date('2026-10-11T15:00:00Z')),false);
 assert.doesNotThrow(()=>prepareOrder([{productId:'pulp-mango',quantity:1}],customer,b,'RG-TEST',new Date('2026-10-11T15:00:00Z')));
});
