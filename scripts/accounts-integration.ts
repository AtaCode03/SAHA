import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {PrismaClient} from '@prisma/client';
export async function accountsIntegration(db:PrismaClient,admin:any,op:any,write:any,csrf:string,opCsrf:string){
 const customer=await db.customer.create({data:{name:'SENTETİK FİNANS TESTİ',phone:'TEST',neighborhood:'TEST',source:'SYNTHETIC'}});
 const field=await db.field.create({data:{customerId:customer.id,name:'SENTETİK HESAP TARLA',province:'Konya',district:'Seydişehir',neighborhood:'TEST',source:'SYNTHETIC'}});
 const make=async(price:string,status:'COMPLETED'|'PLANNED',date:string)=>db.workOrder.create({data:{customerId:customer.id,fieldId:field.id,service:'SENTETİK HİZMET',plannedArea:'1',agreedPrice:price,snapshot:{},status,source:'SYNTHETIC',completedAt:status==='COMPLETED'?new Date(date):null}});
 const a=await make('100.10','COMPLETED','2026-10-15T10:00:00Z'),b=await make('50.20','COMPLETED','2026-10-16T10:00:00Z'),planned=await make('999','PLANNED','2026-10-17T10:00:00Z');
 const url='/finance/accounts/'+customer.id;
 const request=await db.appointmentRequest.create({data:{fieldId:field.id,service:'SENTETİK RANDEVU',requestedDay:'2026-10-20',earliestDay:'2026-10-20',latestDay:'2026-10-20',windows:[{start:'08:00',end:'17:00'}],agreedPrice:'75.25',source:'SYNTHETIC'}});
 const daily=await admin.get('/api/planning/appointments?status=PENDING&day=2026-10-20');assert.equal(daily.status,200);assert.ok(daily.body.data.some((a:any)=>a.id===request.id));
 assert.ok(!(await admin.get('/api/planning/appointments?status=PENDING&day=2026-10-21')).body.data.some((a:any)=>a.id===request.id));
 assert.equal((await op.get('/api/planning/appointments?status=PENDING&day=2026-10-20')).status,403);
 assert.equal((await admin.get('/api/planning/appointments?status=PENDING&day=invalid')).status,422);
 let early=await admin.get('/api'+url);assert.equal(early.body.remaining,'225.55');assert.equal(early.body.collectible,'150.30');
 let earlyList=await admin.get('/api/finance/accounts?q='+encodeURIComponent(customer.name));assert.equal(earlyList.body.data[0].remaining,'225.55');
 const cancelled=await write(admin,csrf,'/planning/appointments/'+request.id+'/cancel',{reason:'SENTETİK MÜŞTERİ VAZGEÇTİ'});assert.equal(cancelled.status,200);assert.ok(!(await admin.get('/api/planning/appointments?status=PENDING&day=2026-10-20')).body.data.some((a:any)=>a.id===request.id));
 assert.equal((await admin.get('/api'+url)).body.remaining,'150.30');
 assert.equal((await db.auditLog.count({where:{entity:'appointment',entityId:request.id,action:'CANCEL'}})),1);
 const linked=await db.appointmentRequest.create({data:{fieldId:field.id,service:'SENTETİK PROGRAM',requestedDay:'2026-10-20',earliestDay:'2026-10-20',latestDay:'2026-10-20',windows:[],agreedPrice:'999',source:'SYNTHETIC',status:'SCHEDULED',orderId:planned.id}});
 assert.equal((await admin.get('/api'+url)).body.remaining,'1149.30');
 earlyList=await admin.get('/api/finance/accounts?q='+encodeURIComponent(customer.name));assert.equal(earlyList.body.data[0].remaining,'1149.30');
 assert.equal((await write(admin,csrf,'/orders/'+planned.id+'/status',{status:'CANCELLED',reason:'SENTETİK PROGRAM İPTAL'})).status,200);
 assert.equal((await admin.get('/api'+url)).body.remaining,'150.30');
 // Restore the standalone planned fixture for the existing allocation boundary checks.
 await db.appointmentRequest.delete({where:{id:linked.id}});await db.workOrder.update({where:{id:planned.id},data:{status:'PLANNED'}});

 assert.equal((await op.get('/api'+url)).status,403);
 assert.equal((await write(op,opCsrf,url+'/preview',{amount:'1'})).status,403);
 assert.equal((await write(admin,csrf,'/orders/'+planned.id+'/payments',{amount:'1',at:new Date().toISOString(),idempotencyKey:randomUUID()})).status,422);
 let account=await admin.get('/api'+url);assert.equal(account.status,200);assert.equal(account.body.remaining,'150.30');assert.equal(account.body.charged,'150.30');
 assert.equal((await write(admin,csrf,'/finance/orders/'+a.id+'/credit',{dueDay:'2026-10-17',note:'SENTETİK VERESİYE',reason:'SENTETİK TEST VADE'},'put')).status,200);
 const list=await admin.get('/api/finance/accounts?q='+encodeURIComponent(customer.name)+'&openOnly=true');assert.equal(list.body.data[0].overdue,true);
 const preview=await write(admin,csrf,url+'/preview',{amount:'120.30'});assert.equal(preview.status,200);assert.deepEqual(preview.body.allocations,[{orderId:a.id,amount:'100.10'},{orderId:b.id,amount:'20.20'}]);
 const receipt={amount:'120.30',method:'CASH',at:new Date().toISOString(),idempotencyKey:randomUUID(),allocations:preview.body.allocations};
 const saved=await write(admin,csrf,url+'/receipts',receipt);assert.equal(saved.status,201,JSON.stringify(saved.body));assert.equal(saved.body.payments.length,2);
 const replay=await write(admin,csrf,url+'/receipts',receipt);assert.equal(replay.status,201);assert.equal(replay.body.id,saved.body.id);
 assert.equal((await write(admin,csrf,url+'/receipts',{...receipt,amount:'120.31'})).status,409);
 assert.equal((await write(admin,csrf,url+'/receipts',{...receipt,amount:'1',idempotencyKey:randomUUID(),allocations:[{orderId:planned.id,amount:'1'}]})).status,409);
 const wrong=await db.customer.create({data:{name:'SENTETİK BAŞKA MÜŞTERİ',phone:'TEST',neighborhood:'TEST',source:'SYNTHETIC'}});
 assert.equal((await write(admin,csrf,'/finance/accounts/'+wrong.id+'/receipts',{...receipt,idempotencyKey:randomUUID()})).status,409);
 assert.equal((await write(admin,csrf,url+'/preview',{amount:'30.01'})).status,422);
 const payment=saved.body.payments.find((p:any)=>p.orderId===a.id);const correction={amount:'90.10',method:'TRANSFER',at:payment.at,version:payment.version,note:'SENTETİK DÜZELTME',reason:'SENTETİK YANLIŞ TUTAR'};
 assert.equal((await write(op,opCsrf,'/finance/payments/'+payment.id,correction,'put')).status,403);
 assert.equal((await write(admin,csrf,'/finance/payments/'+payment.id,correction,'put')).status,200);
 assert.equal((await write(admin,csrf,'/finance/payments/'+payment.id,correction,'put')).status,409);
 const correctedReceipt=await db.customerReceipt.findUniqueOrThrow({where:{id:saved.body.id},include:{payments:true}});assert.equal(correctedReceipt.amount.toFixed(2),'110.30');assert.equal(correctedReceipt.method,'TRANSFER');assert.ok(correctedReceipt.payments.every(p=>p.method==='TRANSFER'));
 account=await admin.get('/api'+url);assert.equal(account.body.remaining,'40.00');assert.ok(account.body.history.some((h:any)=>h.action==='CORRECTION'&&h.reason&&h.previousAmount==='100.1'&&h.newAmount==='90.1'));
 const same={amount:'40.00',method:'TRANSFER',at:new Date().toISOString(),idempotencyKey:randomUUID()};
 const concurrent=await Promise.all([write(admin,csrf,url+'/receipts',same),write(admin,csrf,url+'/receipts',{...same,idempotencyKey:randomUUID()})]);assert.equal(concurrent.filter((r:any)=>r.status===201).length,1);assert.equal((await admin.get('/api'+url)).body.remaining,'0.00');
 assert.equal((await db.payment.count({where:{receiptId:saved.body.id}})),2);
 assert.equal((await write(admin,csrf,'/finance/orders/'+a.id+'/credit',{dueDay:null,reason:'SENTETİK TEST TAMAM'},'put')).status,409);
 const cashDay=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});const cash=await admin.get('/api/finance/payments?from='+cashDay+'&to='+cashDay+'&q='+encodeURIComponent(customer.name));assert.equal(cash.status,200);assert.equal(cash.body.collected,'150.30');
 console.log('Müşteri hesabı E2E geçti: tamamlanma tahakkuku, veresiye/vade, Decimal kısmi/toplu ödeme, dağıtım, müşteri/rol sınırı, mükerrer/eşzamanlı ödeme, düzeltme audit ve bakiye.');
}


