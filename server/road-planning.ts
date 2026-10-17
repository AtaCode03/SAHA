import {Router} from 'express';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {createHash} from 'node:crypto';
import {pointOnFeature} from '@turf/turf';
import {rateLimit} from 'express-rate-limit';
import {db} from './db.js';
import {admin} from './auth.js';
import {AppError,assertAccess,boundarySchema} from './domain.js';
import {roadMatrix,roadDirections,roadSnap} from './road-provider.js';
const json=(v:any)=>JSON.parse(JSON.stringify(v));
const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const roadHash=(v:any)=>createHash('sha256').update(JSON.stringify(canonical(json(v)))).digest('hex');
const point=z.object({longitude:z.number().min(-180).max(180),latitude:z.number().min(-90).max(90),confirmed:z.literal(true),reason:z.string().trim().min(5).max(500)}).strict();
const access=z.object({longitude:z.number().min(-180).max(180),latitude:z.number().min(-90).max(90),confirmed:z.literal(true),confirmedAt:z.iso.datetime(),confirmedById:z.string(),geometryHash:z.string().optional(),reason:z.string(),source:z.literal('OPERATOR_CONFIRMED')});
export const fieldRoadHash=(f:any)=>roadHash({boundary:f.boundary??null,latitude:f.latitude??null,longitude:f.longitude??null});
export function assertRoadMatches(payload:any){
 const configured=Number(process.env.ORS_MAX_SNAP_DISTANCE_METERS??200),limit=Number.isFinite(configured)&&configured>0&&configured<=1000?configured:200;
 if(!payload.matchInfoAvailable||!Array.isArray(payload.matches)||payload.matches.length!==payload.points?.length)throw new AppError(502,'ROAD_MATCH_UNKNOWN','Yola eşleme mesafeleri doğrulanamadı; matris yeniden alınmalı.');
 if(payload.matches.some((m:any)=>m.sourceDistanceMeters!=null&&m.sourceDistanceMeters>limit||m.destinationDistanceMeters!=null&&m.destinationDistanceMeters>limit))throw new AppError(422,'ROAD_POINT_TOO_FAR',`Bir depo/giriş noktası seçilenden ${limit} metreden uzak yola eşlenmiş. Noktayı haritada kontrol edip yeniden teyit edin.`);
}
type Client=Prisma.TransactionClient;
export async function roadInputs(tx:Client,profileId:string,requestIds:string[]){
 const p=await tx.planningProfile.findUniqueOrThrow({where:{id:profileId}}),base=access.safeParse(p.baseLocation);
 if(!p.active||!base.success)throw new AppError(422,'BASE_NOT_CONFIRMED','Ekip için depo/başlangıç noktası haritada teyit edilmeli.');
 const requests=await tx.appointmentRequest.findMany({where:{id:{in:requestIds}},include:{field:true},orderBy:{id:'asc'}});
 if(requests.length!==requestIds.length||requests.some(r=>r.status!=='PENDING'||!r.field.active))throw new AppError(422,'ROAD_REQUEST','Yalnız aktif tarladaki bekleyen talepler kullanılabilir.');
 const points=[{id:'BASE',longitude:base.data.longitude,latitude:base.data.latitude,accessConfirmed:true as const}],sources:any[]=[];
 for(const r of requests){const a=access.safeParse(r.field.roadAccess);if(!a.success||a.data.geometryHash!==fieldRoadHash(r.field))throw new AppError(422,'ACCESS_NOT_CONFIRMED',r.field.name+': tarla girişi eksik veya parsel değişmiş; yeniden teyit edin.');points.push({id:r.id,longitude:a.data.longitude,latitude:a.data.latitude,accessConfirmed:true});sources.push({requestId:r.id,revision:r.revision,source:r.source,fieldSource:r.field.source,fieldId:r.fieldId,access:a.data,geometryHash:fieldRoadHash(r.field)});}
 return {sourceType:new Set(requests.map(r=>r.source)).size>1?'MIXED':requests[0]?.source??'UNKNOWN',profileId:p.id,profileVersion:p.version,base:base.data,sources,points};
}
export async function loadRoadMatrices(tx:Client,profileIds:string[],assignments:{requestId:string;profileId:string}[],ids:string[]){
 const matrices=await tx.travelMatrix.findMany({where:{id:{in:ids}}});
 if(matrices.length!==profileIds.length||ids.length!==profileIds.length||new Set(matrices.map(m=>m.profileId)).size!==profileIds.length)throw new AppError(422,'ROAD_MATRIX_SET','Her seçili ekip için bir yol matrisi gerekli.');
 const legs:{profileId:string;from:string;to:string;minutes:number}[]=[];
 for(const p of profileIds){const m=matrices.find(m=>m.profileId===p);if(!m||m.expiresAt.getTime()<=Date.now())throw new AppError(409,'ROAD_MATRIX_STALE','Yol matrisi eskimiş; tekrar hesaplayın.');const current=await roadInputs(tx,p,assignments.filter(a=>a.profileId===p).map(a=>a.requestId));if(roadHash(current)!==m.inputHash)throw new AppError(409,'ROAD_POINTS_CHANGED','Depo, giriş, profil veya talep değişmiş; yol matrisini yenileyin.');for(const l of (m.payload as any).legs)if(l.reachable&&l.minutes!=null&&l.minutes<=1440)legs.push({profileId:p,from:l.from,to:l.to,minutes:l.minutes});}
 for(const m of matrices)assertRoadMatches(m.payload);return {legs,matrices};
}
export const roadPlanningRouter=Router();
roadPlanningRouter.get('/orders/:id/route',async(req,res)=>{
 const o=await db.workOrder.findUniqueOrThrow({where:{id:z.uuid().parse(req.params.id)}});assertAccess(req.actor!.role,req.actor!.id,o.operatorId);const p=(o.snapshot as any)?.planning;
 if(!p?.planId)throw new AppError(404,'ROAD_ROUTE_MISSING','Bu iş için kayıtlı güzergâh yok.');
 const route=await db.travelRoute.findUnique({where:{planId_profileId:{planId:p.planId,profileId:p.profile.id}}});if(!route)throw new AppError(404,'ROAD_ROUTE_MISSING','Yönetici henüz yol çizgisini almadı.');res.json(route.payload);
});
roadPlanningRouter.use(admin);
roadPlanningRouter.use(rateLimit({windowMs:15*60000,limit:40,keyGenerator:req=>req.actor!.id,standardHeaders:true,legacyHeaders:false,message:{error:{code:'ROAD_RATE_LIMIT',message:'Yol planlama sorgu sınırına ulaşıldı.'}}}));
roadPlanningRouter.get('/fields/:id/access',async(req,res)=>{const f=await db.field.findUniqueOrThrow({where:{id:z.uuid().parse(req.params.id)}});let center:any=null;if(f.boundary){const g=boundarySchema.parse(f.boundary);if(g){const p=pointOnFeature(g).geometry.coordinates;center={longitude:p[0],latitude:p[1]};}}res.json({id:f.id,name:f.name,boundary:f.boundary,geometryHash:fieldRoadHash(f),center: center??(f.latitude!=null&&f.longitude!=null?{latitude:f.latitude,longitude:f.longitude}:null),access:f.roadAccess});});
roadPlanningRouter.put('/fields/:id/access',async(req,res)=>{const input=z.object({point,geometryHash:z.string().length(64)}).strict().parse(req.body);const result=await db.$transaction(async tx=>{const f=await tx.field.findUniqueOrThrow({where:{id:z.uuid().parse(req.params.id)}});if(fieldRoadHash(f)!==input.geometryHash)throw new AppError(409,'FIELD_CHANGED','Parsel değişmiş; haritayı yenileyin.');const after={...input.point,geometryHash:input.geometryHash,confirmedAt:new Date().toISOString(),confirmedById:req.actor!.id,source:'OPERATOR_CONFIRMED'};await tx.field.update({where:{id:f.id},data:{roadAccess:after}});await tx.auditLog.create({data:{userId:req.actor!.id,entity:'field_road_access',entityId:f.id,action:'CONFIRM',before:f.roadAccess??Prisma.JsonNull,after,reason:input.point.reason}});return after;},{isolationLevel:'Serializable'});res.json(result);});
roadPlanningRouter.put('/profiles/:id/base',async(req,res)=>{const input=point.parse(req.body);res.json(await db.$transaction(async tx=>{const p=await tx.planningProfile.findUniqueOrThrow({where:{id:z.uuid().parse(req.params.id)}});const after={...input,confirmedAt:new Date().toISOString(),confirmedById:req.actor!.id,source:'OPERATOR_CONFIRMED'};await tx.planningProfile.update({where:{id:p.id},data:{baseLocation:after,version:{increment:1}}});await tx.auditLog.create({data:{userId:req.actor!.id,entity:'profile_base',entityId:p.id,action:'CONFIRM',before:p.baseLocation??Prisma.JsonNull,after,reason:input.reason}});return after;},{isolationLevel:'Serializable'}));});
roadPlanningRouter.post('/fields/:id/candidate',async(req,res)=>{z.object({transmitConsent:z.literal(true)}).strict().parse(req.body);const f=await db.field.findUniqueOrThrow({where:{id:z.uuid().parse(req.params.id)}});const geometry=boundarySchema.parse(f.boundary);if(!geometry)throw new AppError(422,'GEOMETRY_REQUIRED','Yol adayı için kayıtlı parsel sınırı gerekli.');const p=pointOnFeature(geometry).geometry.coordinates;res.json({...await roadSnap(p[0],p[1]),geometryHash:fieldRoadHash(f)});});
roadPlanningRouter.post('/matrices',async(req,res)=>{
 const input=z.object({profileId:z.uuid(),requestIds:z.array(z.uuid()).min(1).max(24),transmitConsent:z.literal(true)}).strict().refine(v=>new Set(v.requestIds).size===v.requestIds.length).parse(req.body);
 const source=await roadInputs(db,input.profileId,input.requestIds),hash=roadHash(source);
 const cached=await db.travelMatrix.findFirst({where:{profileId:input.profileId,inputHash:hash,expiresAt:{gt:new Date()}},orderBy:{retrievedAt:'desc'}});if(cached){try{assertRoadMatches(cached.payload);res.json(cached);return;}catch(e){if(!(e instanceof AppError)||e.code!=='ROAD_MATCH_UNKNOWN')throw e;}}
 const payload=await roadMatrix({points:source.points,transmitConsent:true});
 assertRoadMatches(payload);
 // The public provider cache keys only coordinates; a new confirmation still gets its own source snapshot.
 const row=await db.travelMatrix.create({data:{profileId:input.profileId,createdById:req.actor!.id,inputHash:hash,input:json(source),payload:json(payload),retrievedAt:new Date(payload.retrievedAt),expiresAt:new Date(new Date(payload.retrievedAt).getTime()+15*60000)}});res.status(201).json(row);
});
roadPlanningRouter.post('/plans/:id/route',async(req,res)=>{
 const input=z.object({profileId:z.uuid(),transmitConsent:z.literal(true)}).strict().parse(req.body);const plan=await db.dailyPlan.findUniqueOrThrow({where:{id:z.uuid().parse(req.params.id)}}),p=plan.input as any,r=plan.result as any;
 const old=await db.travelRoute.findUnique({where:{planId_profileId:{planId:plan.id,profileId:input.profileId}}});if(old){res.json(old.payload);return;}
 const matrix=await db.travelMatrix.findFirst({where:{id:{in:p.roadMatrixIds??[]},profileId:input.profileId}});if(!matrix)throw new AppError(422,'ROAD_MATRIX_MISSING','Bu taslakta API yol matrisi yok.');
 const stops=r.stops.filter((s:any)=>s.profileId===input.profileId).sort((a:any,b:any)=>a.sequence-b.sequence);if(!stops.length)throw new AppError(422,'NO_STOPS','Ekip için ziyaret yok.');
 if(plan.status==='DRAFT')await loadRoadMatrices(db,[input.profileId],p.assignments.filter((a:any)=>a.profileId===input.profileId),[matrix.id]);
 const source=matrix.input as any,ids=['BASE',...stops.map((s:any)=>s.requestId),'BASE'];const points=ids.map((id,i)=>{const p=source.points.find((p:any)=>p.id===id);return {...p,id:id==='BASE'?'BASE_'+i:id};});const payload={...await roadDirections({points,transmitConsent:true}),matrixId:matrix.id,profileId:input.profileId,planId:plan.id,sourceType:source.sourceType};
 // Immutable per-plan route; competing identical requests cannot replace the first snapshot.
 const row=await db.travelRoute.upsert({where:{planId_profileId:{planId:plan.id,profileId:input.profileId}},create:{planId:plan.id,profileId:input.profileId,createdById:req.actor!.id,payload:json(payload)},update:{}});res.json(row.payload);
});
