import {Router} from 'express';
import {z} from 'zod';
import {AppError} from './domain.js';
export const mapRouter=Router();
const attribution='© Harita Genel Müdürlüğü — HGM Atlas';
export function mapConfiguration(){
 if(process.env.MAP_PROVIDER==='MAPTILER'&&process.env.MAPTILER_API_KEY?.trim())return {requestedProvider:'MAPTILER',activeProvider:'MAPTILER',configured:true,defaultLayer:'satellite',message:'MapTiler uydu görüntüsü · Kırmızı parsel sınırı ayrı TKGM verisidir.',standard:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'© OpenStreetMap contributors',attributionUrl:'https://www.openstreetmap.org/copyright'},satellite:{url:'/api/maps/maptiler/satellite/{z}/{x}/{y}',attribution:'© MapTiler · © OpenStreetMap contributors',attributionUrl:'https://www.maptiler.com/copyright/'}};

 const selected=process.env.MAP_PROVIDER==='HGM_ATLAS',ready=selected&&Boolean(process.env.HGM_ATLAS_API_KEY?.trim());
 return {requestedProvider:selected?'HGM_ATLAS':'OSM',activeProvider:ready?'HGM_ATLAS':'OSM',configured:ready,message:selected&&!ready?'HGM Atlas seçildi ancak API anahtarı yok. Geçici olarak OpenStreetMap gösteriliyor.':ready?'HGM Atlas harita altlığı. Parsel sınırı ayrı TKGM verisidir.':'OpenStreetMap harita altlığı.',standard:ready?{url:'/api/maps/hgm/temel/{z}/{x}/{y}',attribution,attributionUrl:'https://www.harita.gov.tr/'}:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'© OpenStreetMap contributors',attributionUrl:'https://www.openstreetmap.org/copyright'},satellite:ready?{url:'/api/maps/hgm/ortofoto/{z}/{x}/{y}',overlayUrl:'/api/maps/hgm/etiket/{z}/{x}/{y}',attribution,attributionUrl:'https://www.harita.gov.tr/'}:null};
}
mapRouter.get('/config',(_req,res)=>res.json(mapConfiguration()));
// Paths verified against the official atlas.js v1.0.0 SDK. SDK code is not copied.
export function atlasTileUrl(layer:string,z:number,x:number,y:number,key:string){
 const paths:Record<string,string>={temel:'harita/hgm_harita',ortofoto:'ortofoto',etiket:'harita/hgm_ortofoto'};
 if(!paths[layer])throw Error('Unknown Atlas layer');
 return 'https://atlas.harita.gov.tr/webservis/'+paths[layer]+'/'+z+'/'+x+'/'+y+(layer==='ortofoto'?'.jpg':'.png')+'?apikey='+encodeURIComponent(key);
}
mapRouter.get('/hgm/:layer/:z/:x/:y',async(req,res)=>{
 const key=process.env.HGM_ATLAS_API_KEY?.trim();if(process.env.MAP_PROVIDER!=='HGM_ATLAS'||!key)throw new AppError(503,'HGM_NOT_CONFIGURED','HGM Atlas API anahtarı yapılandırılmadı.');
 const p=z.object({layer:z.enum(['temel','ortofoto','etiket']),z:z.coerce.number().int().min(0).max(22),x:z.coerce.number().int().min(0),y:z.coerce.number().int().min(0)}).parse(req.params);
 if(p.x>=2**p.z||p.y>=2**p.z)throw new AppError(422,'TILE_COORDINATES','Geçersiz harita döşemesi.');
 try{const upstream=await fetch(atlasTileUrl(p.layer,p.z,p.x,p.y,key),{redirect:'error',signal:AbortSignal.timeout(10000)}),type=upstream.headers.get('content-type')??'';
 if(!upstream.ok||!/^image\/(png|jpeg|webp)(;|$)/i.test(type)||!upstream.body)throw Error();
 const reader=upstream.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
 res.set('Content-Type',type).set('Cache-Control','private, no-store').send(Buffer.concat(chunks));
 }catch{throw new AppError(502,'HGM_SERVICE_ERROR','HGM Atlas görüntüsü alınamadı. Anahtar, servis erişimi ve kullanım koşullarını kontrol edin.');}
});

mapRouter.get('/maptiler/satellite/:z/:x/:y',async(req,res)=>{
 const key=process.env.MAPTILER_API_KEY?.trim();if(process.env.MAP_PROVIDER!=='MAPTILER'||!key)throw new AppError(503,'MAPTILER_NOT_CONFIGURED','MapTiler anahtarı yapılandırılmadı.');
 const p=z.object({z:z.coerce.number().int().min(0).max(22),x:z.coerce.number().int().min(0),y:z.coerce.number().int().min(0)}).parse(req.params);
 if(p.x>=2**p.z||p.y>=2**p.z)throw new AppError(422,'TILE_COORDINATES','Geçersiz döşeme.');
 try{const r=await fetch('https://api.maptiler.com/tiles/satellite-v2/'+p.z+'/'+p.x+'/'+p.y+'.jpg?key='+encodeURIComponent(key),{redirect:'error',signal:AbortSignal.timeout(10000)}),type=r.headers.get('content-type')??'';
 if(!r.ok||!/^image\/(jpeg|png|webp)(;|$)/i.test(type)||!r.body)throw Error();
 const reader=r.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
 res.set('Content-Type',type).set('Cache-Control','private, no-store').send(Buffer.concat(chunks));
 }catch{throw new AppError(502,'MAPTILER_SERVICE_ERROR','Uydu görüntüsü alınamadı. MapTiler anahtarı, kota ve bağlantıyı kontrol edin.');}
});
