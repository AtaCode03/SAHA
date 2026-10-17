import {pricingInput} from './pricing-domain.js';
import {z} from 'zod';
import {area} from '@turf/turf';
import {Decimal} from 'decimal.js';
import {AppError,boundarySchema,money} from './domain.js';
export const daySchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const n=Date.parse(s+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s;},'Geçerli gün girin.');
export const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const minute=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
export const windowsSchema=z.array(z.object({start:clock,end:clock}).strict()).min(1).max(8).superRefine((rows,ctx)=>{const sorted=[...rows].sort((a,b)=>a.start.localeCompare(b.start));for(let i=0;i<sorted.length;i++)if(sorted[i].end<=sorted[i].start||(i>0&&sorted[i].start<sorted[i-1].end))ctx.addIssue({code:'custom',message:'Saat aralıkları aynı gün içinde, artan ve çakışmasız olmalı.'});});
export const appointmentInput=z.object({fieldId:z.uuid(),service:z.string().trim().min(2).max(100),requestedDay:daySchema,earliestDay:daySchema,latestDay:daySchema,windows:windowsSchema,scope:z.literal('FULL_PARCEL'),agreedPrice:money,pricing:pricingInput.optional()}).strict().superRefine((v,c)=>{if(v.earliestDay>v.requestedDay||v.latestDay<v.requestedDay||Date.parse(v.latestDay)-Date.parse(v.earliestDay)>31*86400000)c.addIssue({code:'custom',message:'İstenen gün esneklik aralığında olmalı; esneklik en çok31 gün olabilir.'});});
const duration=z.string().regex(/^\d{1,4}(\.\d{1,3})?$/).refine(v=>new Decimal(v).lte(1440));
export const weatherPolicySchema=z.object({maxWindMs:z.number().min(0).max(200),maxGustMs:z.number().min(0).max(200),maxPrecipitationMm:z.number().min(0).max(1000),minTemperatureC:z.number().min(-100).max(70),maxTemperatureC:z.number().min(-100).max(70),minHumidityPercent:z.number().min(0).max(100),maxHumidityPercent:z.number().min(0).max(100),reference:z.string().trim().min(5).max(500),reviewedDay:daySchema}).strict().refine(p=>p.minTemperatureC<=p.maxTemperatureC&&p.minHumidityPercent<=p.maxHumidityPercent,'Alt sınır üst sınırı aşamaz.');
export const profileInput=z.object({name:z.string().trim().min(2).max(100),operatorId:z.uuid(),droneId:z.uuid(),service:z.string().trim().min(2).max(100),preparationMinutes:duration,minutesPerDekar:duration.refine(v=>new Decimal(v).gt(0)),closingMinutes:duration,coefficientSource:z.string().trim().min(5).max(500),weatherPolicy:weatherPolicySchema.nullable().default(null),shiftStart:clock,shiftEnd:clock,baseName:z.string().trim().min(2).max(150),active:z.boolean().default(true)}).strict().refine(v=>v.shiftEnd>v.shiftStart,'Mesai bitişi başlangıçtan sonra olmalı.');
export function weatherWindows(day:string,windows:{start:string;end:string}[],forecast:any,policy:z.infer<typeof weatherPolicySchema>,now=Date.now()){
 if(!forecast||now-new Date(forecast.retrievedAt).getTime()>3600000||new Date(forecast.retrievedAt).getTime()>now+60000)return [];
 const hours=forecast.payload?.hours;if(!Array.isArray(hours)||hours.length!==24)return [];
 const spans:{start:number;end:number}[]=[];
 for(const h of hours){const v=[h.windSpeedMs,h.windGustMs,h.precipitationMm,h.temperatureC,h.relativeHumidityPercent];if(v.some(n=>typeof n!=='number'||!Number.isFinite(n))||h.windSpeedMs>policy.maxWindMs||h.windGustMs>policy.maxGustMs||h.precipitationMm>policy.maxPrecipitationMm||h.temperatureC<policy.minTemperatureC||h.temperatureC>policy.maxTemperatureC||h.relativeHumidityPercent<policy.minHumidityPercent||h.relativeHumidityPercent>policy.maxHumidityPercent)continue;
 const start=(new Date(h.validAt).getTime()-localInstant(day,0))/60000;if(!Number.isFinite(start)||start<0||start>=1440)continue;const prev=spans.at(-1);if(prev&&prev.end===start)prev.end=start+60;else spans.push({start,end:start+60});}
 const fmt=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 return windows.flatMap(w=>spans.flatMap(s=>{const start=Math.max(minute(w.start),s.start),end=Math.min(minute(w.end),s.end);return end>start?[{start:fmt(start),end:fmt(end)}]:[];}));
}
export function estimateField(boundary:unknown,profile:{preparationMinutes:any;minutesPerDekar:any;closingMinutes:any}){
 const geometry=boundarySchema.parse(boundary);if(!geometry)throw new AppError(422,'GEOMETRY_REQUIRED','Otomatik alan için kayıtlı parsel sınırı gerekli.');
 const squareMeters=area(geometry);if(!Number.isFinite(squareMeters)||squareMeters<=0)throw new AppError(422,'INVALID_AREA','Parsel alanı hesaplanamadı.');
 const dekar=new Decimal(squareMeters.toString()).div(1000),minutes=new Decimal(profile.preparationMinutes.toString()).plus(dekar.mul(profile.minutesPerDekar.toString())).plus(profile.closingMinutes.toString());
 if(dekar.gt(999999999)||minutes.gt(1440))throw new AppError(422,'CAPACITY','Alan/süre bir günlük planlama sınırını aşıyor.');
 return {squareMeters: new Decimal(squareMeters.toString()).toFixed(3),dekar:dekar.toFixed(3),minutes:minutes.ceil().toNumber(),method:'PROFILE_V1',areaOrigin:'GEOMETRY_CALCULATED',scope:'FULL_PARCEL',formula:'hazırlık + dekar × etkin dakika/dekar + kapanış'};
}
export const localInstant=(day:string,minutes:number)=>new Date(day+'T00:00:00+03:00').getTime()+minutes*60000;
export type Candidate={id:string;profileId:string;minutes:number;windows:{start:string;end:string}[]};
export type Leg={profileId:string;from:string;to:string;minutes:number};
// Directed manual road times; an absent leg is unknown, never zero or aerial travel.
export function scheduleDay(day:string,profiles:{id:string;operatorId:string;droneId:string;shiftStart:string;shiftEnd:string;busy?:{start:number;end:number}[]}[],jobs:Candidate[],legs:Leg[],fixedOrder:string[]=[]){
 const remaining=new Map(jobs.map(j=>[j.id,j])),stops:any[]=[],excluded:any[]=[];
 const routes=profiles.map(p=>({...p,at:minute(p.shiftStart),last:'BASE',sequence:0,travel:0,service:0,wait:0}));
 const usedOperators=new Set<string>(),usedDrones=new Set<string>();for(const p of profiles){if(usedOperators.has(p.operatorId)||usedDrones.has(p.droneId))throw new AppError(422,'SHARED_RESOURCE','Bir kişi veya drone aynı taslakta iki bağımsız ekip olamaz.');usedOperators.add(p.operatorId);usedDrones.add(p.droneId);}
 const leg=(p:string,from:string,to:string)=>legs.find(l=>l.profileId===p&&l.from===from&&l.to===to)?.minutes;
 while(remaining.size){const options:any[]=[];for(const route of routes)for(const job of remaining.values()){
   if(job.profileId!==route.id)continue;
   if(fixedOrder.length&&job.id!==fixedOrder.find(id=>remaining.has(id)))continue;
   const travel=leg(route.id,route.last,job.id),back=leg(route.id,job.id,'BASE');if(travel==null||back==null)continue;
   for(const w of job.windows){let start=Math.max(route.at+travel,minute(w.start));for(let i=0;i<=(route.busy?.length??0);i++){const conflict=route.busy?.find(b=>start-travel<b.end&&start+job.minutes>b.start);if(!conflict)break;start=conflict.end+travel;}const end=start+job.minutes;if(end<=minute(w.end)&&end+back<=minute(route.shiftEnd)&&!route.busy?.some(b=>end<b.end&&end+back>b.start)){options.push({route,job,travel,start,end,back});break;}}
 }
 if(!options.length){if(fixedOrder.length){const id=fixedOrder.find(id=>remaining.has(id))!;excluded.push({requestId:id,reason:'Eksik yol/hava verisi veya mesai/müşteri penceresine sığmayan iş.'});remaining.delete(id);continue;}break;}
 options.sort((a,b)=>a.end-b.end||a.travel-b.travel||a.job.id.localeCompare(b.job.id));const x=options[0],wait=x.start-x.route.at-x.travel;
 stops.push({requestId:x.job.id,profileId:x.route.id,sequence:++x.route.sequence,start:new Date(localInstant(day,x.start)).toISOString(),end:new Date(localInstant(day,x.end)).toISOString(),travelMinutes:x.travel,serviceMinutes:x.job.minutes,waitMinutes:wait});
 x.route.at=x.end;x.route.last=x.job.id;x.route.travel+=x.travel;x.route.service+=x.job.minutes;x.route.wait+=wait;remaining.delete(x.job.id);
 }
 for(const j of remaining.values())excluded.push({requestId:j.id,reason:'Eksik yönlü yol süresi veya mesai/müşteri penceresine sığmayan iş.'});
 return {algorithm:'earliest-finish-v1',travelSource:'MANUAL_ROAD_MINUTES',optimal:false,stops,excluded,routes:routes.map(r=>({...r,returnMinutes:r.last==='BASE'?0:leg(r.id,r.last,'BASE'),totalMinutes:r.at-minute(r.shiftStart)+(r.last==='BASE'?0:leg(r.id,r.last,'BASE')!)}))};
}
export function suggestDay(day:string,profiles:Parameters<typeof scheduleDay>[1],jobs:Candidate[],legs:Leg[]){
 const started=performance.now();let best=scheduleDay(day,profiles,jobs,legs),trials=0;
 const score=(r:ReturnType<typeof scheduleDay>)=>[r.excluded.length,r.routes.reduce((n,x)=>n+x.totalMinutes,0),r.routes.reduce((n,x)=>n+x.travel+(x.returnMinutes??0),0)];
 const better=(a:ReturnType<typeof scheduleDay>,b:ReturnType<typeof scheduleDay>)=>{const x=score(a),y=score(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]<y[i];return false;};
 let order=[...best.stops.map(s=>s.requestId),...best.excluded.map(s=>s.requestId)];
 for(let i=0;i<order.length-1&&trials<100;i++)for(let j=i+1;j<order.length&&trials<100;j++){const candidate=[...order.slice(0,i),...order.slice(i,j+1).reverse(),...order.slice(j+1)];const r=scheduleDay(day,profiles,jobs,legs,candidate);trials++;if(better(r,best)){best=r;order=candidate;}}
 return {...best,algorithm:'earliest-finish-2opt-v1',trials,solveMilliseconds:performance.now()-started};
}
