import {readFileSync} from 'node:fs';
import {z} from 'zod';
const row=z.object({id:z.number().int(),name:z.string(),provinceId:z.number().int().optional(),districtId:z.number().int().optional()});
function load(name:string){return z.array(row).parse(JSON.parse(readFileSync(new URL('../data/administrative/'+name+'.json',import.meta.url),'utf8')));}
const provinces=load('provinces'),districts=load('districts'),neighborhoods=load('neighborhoods'),villages=load('villages');
const options=(rows:typeof provinces,prefix:string)=>rows.map(v=>({id:prefix+v.id,name:v.name})).sort((a,b)=>a.name.localeCompare(b.name,'tr'));
export const catalogProvinces=()=>options(provinces,'tr-province-');
export const catalogDistricts=(id:string)=>options(districts.filter(v=>'tr-province-'+v.provinceId===id),'tr-district-');
export const catalogNeighborhoods=(id:string)=>[...options(neighborhoods.filter(v=>'tr-district-'+v.districtId===id),'tr-neighborhood-'),...options(villages.filter(v=>'tr-district-'+v.districtId===id),'tr-village-')].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
