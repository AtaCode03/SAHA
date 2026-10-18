import assert from 'node:assert/strict';
import type {PrismaClient} from '@prisma/client';
export async function roadPlanningIntegration(db:PrismaClient,adminAgent:any,opAgent:any,otherAgent:any,write:any,csrf:string,opCsrf:string,fieldId:string,profileId:string,requestBody:any){
 const originalFetch=globalThis.fetch,originalKey=process.env.ORS_API_KEY;let externalCalls=0;
 process.env.ORS_API_KEY='SYNTHETIC_TEST_KEY';
 globalThis.fetch=async(url:any,options:any)=>{externalCalls++;assert.match(String(url),/^https:\/\/api\.openrouteservice\.org\/v2\//);const body=JSON.parse(options.body);assert.equal(Object.hasOwn(body,'name'),false);assert.equal(Object.hasOwn(body,'phone'),false);assert.equal(options.headers.Authorization,'SYNTHETIC_TEST_KEY');
  const locations=body.locations??body.coordinates;
  if(String(url).includes('/snap/'))return new Response(JSON.stringify({locations:[{location:[31,37],snapped_distance:100,name:'SENTETİK YOL'}]}),{headers:{'content-type':'application/json'}});
  if(String(url).includes('/matrix/'))return new Response(JSON.stringify({sources:locations.map((location:any)=>({location,snapped_distance:0})),destinations:locations.map((location:any)=>({location,snapped_distance:0})),durations:locations.map((_:any,i:number)=>locations.map((_:any,j:number)=>i===j?0:120+i*60+j*7)),distances:locations.map((_:any,i:number)=>locations.map((_:any,j:number)=>i===j?0:1000+i*100+j*10))}),{headers:{'content-type':'application/json'}});
  assert.equal(options.headers.Accept,'application/geo+json');return new Response(JSON.stringify({type:'FeatureCollection',features:[{geometry:{type:'LineString',coordinates:locations},properties:{summary:{distance:3000,duration:500}}}]}),{headers:{'content-type':'application/geo+json'}});
 };
 try{
  assert.equal((await opAgent.get('/api/road-planning/fields/'+fieldId+'/access')).status,403);
  const body={...requestBody,requestedDay:'2026-11-22',earliestDay:'2026-11-22',latestDay:'2026-11-22'};
  const r=await write(adminAgent,csrf,'/planning/appointments',body),r2=await write(adminAgent,csrf,'/planning/appointments',body);assert.equal(r.status,201);assert.equal(r2.status,201);
  const input={profileId,requestIds:[r.body.id,r2.body.id],transmitConsent:true};
  const matrix=()=>write(adminAgent,csrf,'/road-planning/matrices',input);
  assert.equal((await matrix()).status,422);assert.equal(externalCalls,0);
  const base={longitude:31,latitude:37,confirmed:true,reason:'SENTETİK TEST DEPOSU'};
  assert.equal((await write(adminAgent,csrf,'/road-planning/profiles/'+profileId+'/base',{...base,confirmed:false},'put')).status,422);
  assert.equal((await write(adminAgent,csrf,'/road-planning/profiles/'+profileId+'/base',base,'put')).status,200);
  assert.equal((await matrix()).status,422);assert.equal(externalCalls,0);
  const details=await adminAgent.get('/api/road-planning/fields/'+fieldId+'/access');assert.equal(details.status,200);
  assert.equal((await write(adminAgent,csrf,'/road-planning/fields/'+fieldId+'/candidate',{})).status,422);
  const candidate=await write(adminAgent,csrf,'/road-planning/fields/'+fieldId+'/candidate',{transmitConsent:true});assert.equal(candidate.status,200);assert.equal(candidate.body.confirmed,false);
  const point={longitude:31,latitude:37,confirmed:true,reason:'SENTETİK GİRİŞ TEYİDİ'};
  assert.equal((await write(opAgent,opCsrf,'/road-planning/fields/'+fieldId+'/access',{point,geometryHash:details.body.geometryHash},'put')).status,403);
  const save=()=>write(adminAgent,csrf,'/road-planning/fields/'+fieldId+'/access',{point,geometryHash:details.body.geometryHash},'put');assert.equal((await save()).status,200);
  const m=await matrix();assert.equal(m.status,201,JSON.stringify(m.body));assert.equal(m.body.payload.legs.length,6);assert.equal(m.body.input.sourceType,'SYNTHETIC');assert.equal(m.body.input.base.source,'APPROXIMATE_DISTRICT_CENTER');assert.equal(m.body.input.base.isLiveLocation,false);assert.equal(m.body.payload.points[0].latitude,37.419);assert.equal(m.body.payload.points[0].longitude,31.849);const count=externalCalls;assert.equal((await matrix()).status,200);assert.equal(externalCalls,count);
  const preview=(matrixId:string)=>write(adminAgent,csrf,'/planning/plans/preview',{day:'2026-11-22',profileIds:[profileId],assignments:input.requestIds.map(requestId=>({requestId,profileId})),legs:[],roadMatrixIds:[matrixId]});
  const draft=await preview(m.body.id);assert.equal(draft.status,201,JSON.stringify(draft.body));assert.equal(draft.body.result.travelSource,'OPENROUTESERVICE');assert.equal(draft.body.result.stops.length,2);
  // A changed confirmation invalidates old matrix/plan even when the coordinate is the same.
  point.reason='SENTETİK YENİ GİRİŞ TEYİDİ';await save();assert.equal((await preview(m.body.id)).status,409);
  assert.equal((await write(adminAgent,csrf,'/planning/plans/'+draft.body.id+'/approve',{weatherReview:'SENTETİK HAVA VE SAHA TEYİDİ'})).status,409);
  const freshMatrix=await matrix();assert.equal(freshMatrix.status,201);
  await db.travelMatrix.update({where:{id:freshMatrix.body.id},data:{expiresAt:new Date(Date.now()-1)}});assert.equal((await preview(freshMatrix.body.id)).status,409);
  const finalMatrix=await matrix(),final=await preview(finalMatrix.body.id);assert.equal(final.status,201,JSON.stringify(final.body));
  const approved=await write(adminAgent,csrf,'/planning/plans/'+final.body.id+'/approve',{weatherReview:'SENTETİK HAVA VE SAHA TEYİDİ'});assert.equal(approved.status,200,JSON.stringify(approved.body));
  const route=await write(adminAgent,csrf,'/road-planning/plans/'+final.body.id+'/route',{profileId,transmitConsent:true});assert.equal(route.status,200,JSON.stringify(route.body));assert.equal(route.body.sourceType,'SYNTHETIC');assert.equal(route.body.geometry.type,'LineString');assert.equal(route.body.geometry.coordinates.length,4);
  const orderId=approved.body.orderIds[0];assert.equal((await otherAgent.get('/api/road-planning/orders/'+orderId+'/route')).status,403);
  const own=await opAgent.get('/api/road-planning/orders/'+orderId+'/route');assert.equal(own.status,200);assert.deepEqual(own.body.geometry,route.body.geometry);assert.equal(JSON.stringify(own.body).includes('agreedPrice'),false);
  const repeatCalls=externalCalls;assert.equal((await write(adminAgent,csrf,'/road-planning/plans/'+final.body.id+'/route',{profileId,transmitConsent:true})).status,200);assert.equal(externalCalls,repeatCalls);
  assert.equal(await db.travelRoute.count({where:{planId:final.body.id}}),1);
  console.log('Yol E2E geçti: teyit/CSRF/rol, eksik depo/giriş, sentetik API matrisi, kalıcı cache, eski/değişen nokta reddi, API kaynaklı plan onayı, kayıtlı LineString ve atanmış operatör erişimi. Gerçek konum aktarılmadı.');
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.ORS_API_KEY;else process.env.ORS_API_KEY=originalKey;}
}

