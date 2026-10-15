import {z} from 'zod';
import {AppError} from './domain.js';
import {validateParcelGeometry} from './parcel-geometry.js';
const base='https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/';
export const localParcelTestEnabled=()=>{if(process.env.PARCEL_PROVIDER!=='TKGM_LOCAL_TEST'||process.env.NODE_ENV!=='development')return false;try{const u=new URL(process.env.APP_ORIGIN??'');return u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname);}catch{return false;}};
export const realParcelEnabled=()=>localParcelTestEnabled()||(process.env.PARCEL_PROVIDER==='TKGM'&&Boolean(process.env.PARCEL_USAGE_AUTHORIZATION_REFERENCE?.trim()));
const code=z.string().regex(/^\d{1,10}$/);
async function read(path:string){
 if(!realParcelEnabled())throw new AppError(503,'PARCEL_SERVICE_NOT_CONFIGURED','Gerçek parsel servisi için kullanım yetkisi ve sağlayıcı ayarı gerekli.');
 try{const r=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
 if(r.status===404)throw new AppError(404,'PARCEL_NOT_FOUND','Parsel kaydı bulunamadı.');
 if(!r.ok||!r.headers.get('content-type')?.includes('json')||!r.body)throw Error();
 const reader=r.body.getReader();let size=0;const chunks:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }catch(e){if(e instanceof AppError)throw e;throw new AppError(502,'PARCEL_SERVICE_ERROR','Parsel veri servisine ulaşılamadı veya yanıt geçersiz. Tekrar deneyin.');}
}
export async function parcelOptions(kind:'ilListe'|'ilceListe'|'mahalleListe',parent?:string){
 if(parent!==undefined)code.parse(parent);
 const raw=await read('idariYapi/'+kind+(parent===undefined?'':'/'+parent));
 const parsed=z.object({features:z.array(z.object({properties:z.object({id:z.union([z.number().int().nonnegative(),code]),text:z.string().min(1).max(200)})})).max(10000)}).safeParse(raw);
 if(!parsed.success)throw new AppError(502,'PARCEL_SERVICE_ERROR','İdari liste yanıtı beklenen yapıda değil.');
 return parsed.data.features.map(f=>({id:String(f.properties.id),name:f.properties.text}));
}
export async function lookupParcel(i:{provinceId:string,districtId:string,neighborhoodId:string,block:string,parcel:string}){
 for(const v of Object.values(i))code.parse(v);
 const provinces=await parcelOptions('ilListe'),districts=await parcelOptions('ilceListe',i.provinceId),neighborhoods=await parcelOptions('mahalleListe',i.districtId);
 const province=provinces.find(v=>v.id===i.provinceId),district=districts.find(v=>v.id===i.districtId),neighborhood=neighborhoods.find(v=>v.id===i.neighborhoodId);
 if(!province||!district||!neighborhood)throw new AppError(422,'ADMINISTRATIVE_SELECTION','İdari seçimler birbiriyle uyumlu değil.');
 const raw=await read('parsel/'+i.neighborhoodId+'/'+i.block+'/'+i.parcel);
 if(raw?.type==='Feature'&&(String(raw.properties?.adaNo)!==i.block||String(raw.properties?.parselNo)!==i.parcel||String(raw.properties?.mahalleId)!==i.neighborhoodId))throw new AppError(502,'PARCEL_ID_MISMATCH','Servis yanıtındaki parsel kimliği sorguyla eşleşmedi.');
 if(raw?.features?.length===0)throw new AppError(404,'PARCEL_NOT_FOUND','Parsel kaydı bulunamadı.');
 let geometry;try{geometry=validateParcelGeometry(raw);}catch{throw new AppError(502,'PARCEL_SERVICE_ERROR','Servis geçerli WGS84 parsel sınırı döndürmedi.');}
 return {provenance:'REAL',province:province.name,district:district.name,neighborhood:neighborhood.name,block:i.block,parcel:i.parcel,areaSquareMeters:null,nature:null,updatedAt:null,source:'TKGM çevrim içi parsel servisi; alan/nitelik eşlemesi doğrulanmadığı için gösterilmiyor',geometry};
}
