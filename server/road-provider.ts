import {z} from 'zod';
import {createHash} from 'node:crypto';
import {AppError} from './domain.js';

export const roadPoint=z.object({id:z.string().min(1).max(100),longitude:z.number().min(-180).max(180),latitude:z.number().min(-90).max(90),accessConfirmed:z.literal(true)}).strict();
export const roadInput=z.object({points:z.array(roadPoint).min(2).max(25),transmitConsent:z.literal(true)}).strict().superRefine((v,c)=>{if(new Set(v.points.map(p=>p.id)).size!==v.points.length)c.addIssue({code:'custom',message:'Nokta kimlikleri benzersiz olmalı.'});});
type Point=z.infer<typeof roadPoint>;
const ready=()=>!!process.env.ORS_API_KEY?.trim();
export function roadStatus(){return {provider:'OPENROUTESERVICE',configured:ready(),keyConfigured:!!process.env.ORS_API_KEY?.trim(),usageReferenceConfigured:!!process.env.ORS_USAGE_AUTHORIZATION_REFERENCE?.trim(),profile:'driving-car',maxPoints:25,sourceUrl:'https://openrouteservice.org/',message:ready()?'Sunucu anahtarı hazır. Canlı erişim ve tarla girişleri ayrıca doğrulanmalı.':'OpenRouteService anahtarı eksik. Karayolu API bağlantısı etkin değil.'};}
async function post(path:'matrix/driving-car'|'directions/driving-car/geojson'|'snap/driving-car/json',body:unknown){
 if(!ready())throw new AppError(503,'ROAD_NOT_CONFIGURED','OpenRouteService yapılandırılmadı; ORS_API_KEY gerekli.');
 let response:Response;
 try{response=await fetch('https://api.openrouteservice.org/v2/'+path,{method:'POST',headers:{Authorization:process.env.ORS_API_KEY!.trim(),'Content-Type':'application/json',Accept:path.startsWith('directions/')?'application/geo+json':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw new AppError(502,'ROAD_SERVICE_ERROR','Yol servisine ulaşılamadı. Sonuç oluşturulmadı.');}
 if(response.status===401||response.status===403)throw new AppError(503,'ROAD_ACCESS_DENIED','Yol servisi anahtarı, erişim yetkisi veya hesap kotası doğrulanamadı.');
 if(response.status===429)throw new AppError(503,'ROAD_QUOTA','Yol servisi kota sınırına ulaşıldı; daha sonra deneyin.');
 if(!response.ok||!response.headers.get('content-type')?.includes('json')||!response.body)throw new AppError(502,'ROAD_SERVICE_ERROR','Yol servisi geçerli sonuç döndürmedi.');
 try{const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError(502,'ROAD_RESPONSE_INVALID','Yol servisi yanıtı okunamadı veya boyut sınırını aştı.');}
}
export async function roadSnap(longitude:number,latitude:number){
 const raw=await post('snap/driving-car/json',{locations:[[longitude,latitude]],radius:1000});
 const parsed=z.object({locations:z.array(z.object({location:z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)]),snapped_distance:z.number().min(0).max(1000),name:z.string().optional()}).nullable()).length(1)}).safeParse(raw);
 if(!parsed.success)throw new AppError(502,'ROAD_RESPONSE_INVALID','Yol giriş adayı doğrulanamadı.');
 const p=parsed.data.locations[0];if(!p)throw new AppError(422,'ROAD_ACCESS_NOT_FOUND','Parsel örnek noktasının1 km yakınında yol adayı bulunamadı. Girişi haritadan kontrol edin.');
 return {longitude:p.location[0],latitude:p.location[1],distanceMeters:p.snapped_distance,name:p.name??null,source:'ORS_ROAD_CANDIDATE',confirmed:false};
}
const metric=z.number().finite().min(0).max(1e9).nullable();
const metadata=z.object({engine:z.object({version:z.string().optional(),graph_date:z.string().optional()}).optional()}).optional();
export function normalizeMatrix(raw:unknown,points:Point[],retrievedAt=new Date()){
 const match=z.object({location:z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)]),snapped_distance:z.number().finite().min(0)}).nullable();
 const parsed=z.object({durations:z.array(z.array(metric)),distances:z.array(z.array(metric)),sources:z.array(match).optional(),destinations:z.array(match).optional(),metadata}).safeParse(raw);
 if(!parsed.success||[parsed.data.durations,parsed.data.distances].some(m=>m.length!==points.length||m.some(row=>row.length!==points.length)))throw new AppError(502,'ROAD_RESPONSE_INVALID','Yol matrisi boyutları veya birimleri doğrulanamadı.');
 const {durations,distances}=parsed.data;
 const legs=points.flatMap((from,i)=>points.flatMap((to,j)=>{if(i===j)return [];const seconds=durations[i][j],meters=distances[i][j],matched=parsed.data.sources&&parsed.data.destinations?!!parsed.data.sources[i]&&!!parsed.data.destinations[j]:true,reachable=seconds!==null&&meters!==null&&matched;return [{from:from.id,to:to.id,durationSeconds:reachable?seconds:null,minutes:reachable?Math.ceil(seconds!/60):null,meters:reachable?meters:null,reachable}];}));
 const matchInfoAvailable=parsed.data.sources?.length===points.length&&parsed.data.destinations?.length===points.length;
 const matches=points.map((p,i)=>({id:p.id,sourceDistanceMeters:parsed.data.sources?.[i]?.snapped_distance??null,destinationDistanceMeters:parsed.data.destinations?.[i]?.snapped_distance??null}));
 return {provider:'OPENROUTESERVICE',version:'ors-matrix-v2',profile:'driving-car',retrievedAt:retrievedAt.toISOString(),traffic:'NOT_LIVE',source:'ROAD_NETWORK_ESTIMATE',points,legs,matchInfoAvailable,matches,engineVersion:parsed.data.metadata?.engine?.version??null,graphDate:parsed.data.metadata?.engine?.graph_date??null,attribution:'© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',sourceUrl:'https://openrouteservice.org/'};
}
const cache=new Map<string,{at:number;data:ReturnType<typeof normalizeMatrix>}>();
const inflight=new Map<string,Promise<ReturnType<typeof normalizeMatrix>>>();
export async function roadMatrix(input:z.infer<typeof roadInput>){
 const data=roadInput.parse(input);if(!ready())throw new AppError(503,'ROAD_NOT_CONFIGURED','OpenRouteService yapılandırılmadı.');
 const hash=createHash('sha256').update(JSON.stringify({points:data.points,profile:'driving-car',version:2})).digest('hex');
 const entry=cache.get(hash);if(entry&&Date.now()-entry.at<15*60000)return {...entry.data,cached:true};
 let pending=inflight.get(hash);if(!pending){if(inflight.size>=4)throw new AppError(429,'ROAD_BUSY','Yol servisi meşgul; biraz sonra deneyin.');pending=(async()=>{const raw=await post('matrix/driving-car',{locations:data.points.map(p=>[p.longitude,p.latitude]),metrics:['duration','distance'],units:'m'});const result=normalizeMatrix(raw,data.points);if(cache.size>=20)cache.delete(cache.keys().next().value!);cache.set(hash,{at:Date.now(),data:result});return result;})().finally(()=>inflight.delete(hash));inflight.set(hash,pending);}
 return {...await pending,cached:false};
}
export async function roadDirections(input:z.infer<typeof roadInput>){
 const {points}=roadInput.safeExtend({points:z.array(roadPoint).min(2).max(50)}).parse(input);const raw=await post('directions/driving-car/geojson',{coordinates:points.map(p=>[p.longitude,p.latitude]),instructions:false,units:'m'});
 const coordinates=z.array(z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)])).min(2).max(100000);
 const parsed=z.object({type:z.literal('FeatureCollection'),features:z.array(z.object({geometry:z.object({type:z.literal('LineString'),coordinates}),properties:z.object({summary:z.object({distance:z.number().finite().min(0),duration:z.number().finite().min(0)})})})).length(1),metadata}).safeParse(raw);
 if(!parsed.success)throw new AppError(502,'ROAD_RESPONSE_INVALID','Yol geometrisi doğrulanamadı.');
 const f=parsed.data.features[0];return {provider:'OPENROUTESERVICE',profile:'driving-car',retrievedAt:new Date().toISOString(),traffic:'NOT_LIVE',geometry:f.geometry,meters:f.properties.summary.distance,minutes:Math.ceil(f.properties.summary.duration/60),attribution:'© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors'};
}
