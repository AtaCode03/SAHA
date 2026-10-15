import {mapConfiguration} from './maps.js';
import {catalogProvinces,catalogDistricts,catalogNeighborhoods} from './administrative.js';
import {realParcelEnabled,localParcelTestEnabled,parcelOptions,lookupParcel} from './parcel-provider.js';
import {Router} from 'express';
import {z} from 'zod';
import {admin} from './auth.js';
import {AppError} from './domain.js';
import {validateParcelGeometry} from './parcel-geometry.js';
export const parcelRouter=Router();parcelRouter.use(admin);
// Explicitly synthetic fixtures. These are NOT TKGM administrative identifiers.
const provinces=[{id:'demo-konya',name:'Konya — Demo veri'},{id:'demo-ankara',name:'Ankara — Demo veri'}];
const districts:Record<string,{id:string,name:string}[]>={'demo-konya':[{id:'demo-seydisehir',name:'Seydişehir — Demo veri'}],'demo-ankara':[{id:'demo-cankaya',name:'Çankaya — Demo veri'}]};
const neighborhoods:Record<string,{id:string,name:string}[]>={'demo-seydisehir':[{id:'demo-mahalle',name:'Örnek Mahalle — Demo veri'}],'demo-cankaya':[{id:'demo-mahalle-ankara',name:'Örnek Mahalle — Demo veri'}]};
const demoGeometry=validateParcelGeometry({type:'Polygon',coordinates:[[[31.845,37.415],[31.847,37.4153],[31.8473,37.4165],[31.8455,37.4168],[31.845,37.415]]]});
function satellite(){
 const url=process.env.PARCEL_SATELLITE_TILE_URL,attribution=process.env.PARCEL_SATELLITE_ATTRIBUTION,license=process.env.PARCEL_SATELLITE_LICENSE_REFERENCE;
 if(!url||!attribution||!license)return null;
 try{if(new URL(url).protocol!=='https:'||!['{z}','{x}','{y}'].every(t=>url.includes(t)))return null;}catch{return null;}
 return {url,attribution,license};
}
parcelRouter.get('/status',(_req,res)=>{const s=satellite(),maps=mapConfiguration();res.json({mode:realParcelEnabled()?'REAL':'CATALOG',realServiceConfigured:realParcelEnabled(),localDevelopmentTest:localParcelTestEnabled(),administrativeCoverage:realParcelEnabled()?'TKGM çevrim içi idari katalog.':'TürkiyeAPI 2025: 81 il, 973 ilçe; mahalle ve köyler. Bağımsız idari katalog, TKGM parsel kimliği değildir.',message:localParcelTestEnabled()?'Yerel geliştirme testi: gerçek TKGM servisi kullanılır. Resmî/ticari kullanım yetkisi doğrulanmadı.':realParcelEnabled()?'TKGM bağlantısı yapılandırıldı; servis hataları sorgu sırasında gösterilir.':'Türkiye adres listeleri hazır. Gerçek parsel sınırı servisi bağlı değil; adres seçimi tek başına sınır sağlamaz.',defaultLayer:maps.defaultLayer??'standard',mapMessage:maps.message,standard:maps.standard,satellite:['HGM_ATLAS','MAPTILER'].includes(maps.requestedProvider)?maps.satellite:s?{url:'/api/parcels/tiles/satellite/{z}/{x}/{y}',attribution:s.attribution}:null});});
parcelRouter.get('/provinces',async(_req,res)=>res.json({data:realParcelEnabled()?await parcelOptions('ilListe'):catalogProvinces(),source:realParcelEnabled()?'REAL':'TURKIYE_API'}));
parcelRouter.get('/districts',async(req,res)=>{const {provinceId}=z.object({provinceId:z.string().max(100)}).parse(req.query);res.json({data:realParcelEnabled()?await parcelOptions('ilceListe',provinceId):catalogDistricts(provinceId),source:realParcelEnabled()?'REAL':'TURKIYE_API'});});
parcelRouter.get('/neighborhoods',async(req,res)=>{const {districtId}=z.object({districtId:z.string().max(100)}).parse(req.query);res.json({data:realParcelEnabled()?await parcelOptions('mahalleListe',districtId):catalogNeighborhoods(districtId),source:realParcelEnabled()?'REAL':'TURKIYE_API'});});
parcelRouter.post('/query',async(req,res)=>{
 const i=z.object({provinceId:z.string(),districtId:z.string(),neighborhoodId:z.string(),block:z.string().regex(/^\d{1,10}$/),parcel:z.string().regex(/^\d{1,10}$/),mode:z.enum(['DEMO','REAL'])}).strict().parse(req.body);
 if(i.mode==='REAL'&&realParcelEnabled()){const {mode,...query}=i;res.json(await lookupParcel(query));return;}
 if(realParcelEnabled())throw new AppError(409,'PARCEL_MODE_CHANGED','Veri modu değişti. Sayfayı yenileyin.');
 if(i.mode==='REAL')throw new AppError(503,'PARCEL_SERVICE_NOT_CONFIGURED','Gerçek parsel servisi yapılandırılmadı. Resmî sorgu yapılmadı.');
 if(!districts[i.provinceId]?.some(d=>d.id===i.districtId)||!neighborhoods[i.districtId]?.some(n=>n.id===i.neighborhoodId))throw new AppError(422,'ADMINISTRATIVE_SELECTION','İl, ilçe ve mahalle seçimi birbiriyle uyumlu değil.');
 if(i.provinceId!=='demo-konya'||i.districtId!=='demo-seydisehir'||i.neighborhoodId!=='demo-mahalle'||i.block!=='100'||i.parcel!=='1')throw new AppError(404,'PARCEL_NOT_FOUND','Bu seçim için demo parsel bulunamadı. Bu, gerçek parselin bulunmadığı anlamına gelmez. Demo: Konya / Seydişehir / Örnek Mahalle, ada 100, parsel 1.');
 res.json({provenance:'DEMO',province:'Konya',district:'Seydişehir',neighborhood:'Örnek Mahalle (sentetik)',block:'100',parcel:'1',areaSquareMeters:null,nature:null,source:'Uygulama demo fikstürü — sentetik geometri, gerçek taşınmaz değildir',updatedAt:null,geometry:demoGeometry});
});
parcelRouter.post('/validate-file',(req,res)=>{try{res.json({geometry:validateParcelGeometry(req.body),provenance:'USER_FILE',source:'Kullanıcının yüklediği dosya; resmî doğrulama yapılmadı'});}catch{throw new AppError(422,'INVALID_PARCEL_GEOMETRY','Geçerli, kapalı ve kesişmeyen WGS84 Polygon/MultiPolygon gerekli. Koordinat sırası [boylam, enlem].');}});
parcelRouter.get('/tiles/satellite/:z/:x/:y',async(req,res)=>{
 const s=satellite();if(!s)throw new AppError(503,'SATELLITE_NOT_CONFIGURED','Lisanslı uydu sağlayıcısı yapılandırılmadı.');
 const p=z.object({z:z.coerce.number().int().min(0).max(22),x:z.coerce.number().int().min(0),y:z.coerce.number().int().min(0)}).parse(req.params);
 if(p.x>=2**p.z||p.y>=2**p.z)throw new AppError(422,'TILE_COORDINATES','Geçersiz harita döşemesi.');
 try{const url=s.url.replaceAll('{z}',String(p.z)).replaceAll('{x}',String(p.x)).replaceAll('{y}',String(p.y));
  const upstream=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)}),type=upstream.headers.get('content-type')??'';
  if(!upstream.ok||!/^image\/(png|jpeg|webp)(;|$)/i.test(type)||!upstream.body)throw Error();
  const reader=upstream.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
  res.set('Content-Type',type).set('Cache-Control','private, max-age=3600').send(Buffer.concat(chunks));
 }catch{throw new AppError(502,'SATELLITE_SERVICE_ERROR','Uydu görüntü servisine ulaşılamadı.');}
});

parcelRouter.post('/query-address',async(req,res)=>{
 const i=z.object({province:z.string().min(1).max(200),district:z.string().min(1).max(200),neighborhood:z.string().min(1).max(200),block:z.string().regex(/^\d{1,10}$/),parcel:z.string().regex(/^\d{1,10}$/)}).strict().parse(req.body);
 if(!realParcelEnabled())throw new AppError(503,'PARCEL_SERVICE_NOT_CONFIGURED','Adres listeleri hazır ancak gerçek parsel sınırı servisi etkin değil. Sınır alınmadı; haritada çizim yapmanız gerekmiyor.');
 const select=(rows:{id:string,name:string}[],name:string)=>{const matches=rows.filter(r=>r.name.normalize('NFC').toLocaleLowerCase('tr-TR')===name.normalize('NFC').toLocaleLowerCase('tr-TR'));if(matches.length!==1)throw new AppError(422,'ADMINISTRATIVE_SELECTION','Adres TKGM kataloğunda tekil eşleştirilemedi. Seçimleri kontrol edin.');return matches[0].id;};
 const provinceId=select(await parcelOptions('ilListe'),i.province),districtId=select(await parcelOptions('ilceListe',provinceId),i.district),neighborhoodId=select(await parcelOptions('mahalleListe',districtId),i.neighborhood);
 res.json(await lookupParcel({provinceId,districtId,neighborhoodId,block:i.block,parcel:i.parcel}));
});
