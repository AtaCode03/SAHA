import {mkdir,writeFile} from 'node:fs/promises';
import {validateParcelGeometry} from '../server/parcel-geometry.js';
import {boundarySchema} from '../server/domain.js';
const base='https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/';
async function read(path:string){const response=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('HTTP '+response.status);return response.json();}
function select(raw:any,name:string){const matches=raw.features?.filter((f:any)=>f.properties?.text?.normalize('NFC').toLocaleLowerCase('tr-TR')===name.normalize('NFC').toLocaleLowerCase('tr-TR'));if(matches?.length!==1)throw Error('İdari kayıt tekil değil: '+name);return String(matches[0].properties.id);}
const provinceId=select(await read('idariYapi/ilListe'),'Konya');
const districtId=select(await read('idariYapi/ilceListe/'+provinceId),'Seydişehir');
const neighborhoodId=select(await read('idariYapi/mahalleListe/'+districtId),'Çat');
const raw=await read('parsel/'+neighborhoodId+'/121/1');
if(String(raw.properties?.adaNo)!=='121'||String(raw.properties?.parselNo)!=='1')throw Error('Servis farklı parsel döndürdü.');
const geometry=validateParcelGeometry(raw);boundarySchema.parse(geometry.features[0].geometry);
await mkdir('.local/verification',{recursive:true});
await writeFile('.local/verification/cat-121-1.json',JSON.stringify({source:base,queriedAt:new Date().toISOString(),purpose:'Kullanıcının istediği tekil bağlantı testi; ticari kullanım yetkisi doğrulanmadı.',provinceId,districtId,neighborhoodId,block:'121',parcel:'1',geometry},null,2));
console.log('Konya/Seydişehir/Çat 121/1: gerçek Polygon alındı, kimlik ve tarla geometri doğrulaması geçti. Ayrıntı gitignored .local/verification altında; otomatik işletme kaydı veya kullanım yetkisi oluşturulmadı.');
