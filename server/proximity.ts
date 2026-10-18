import {distance,point,pointOnFeature} from '@turf/turf';
import {boundarySchema} from './domain.js';
import {planningStart} from './planning-start.js';
export function rankNearby(rows:any[]){
 const excluded:any[]=[],ranked:any[]=[];
 for(const r of rows){try{const geometry=boundarySchema.parse(r.field.boundary);if(!geometry)throw Error();const location=pointOnFeature(geometry);const km=distance(point([planningStart.longitude,planningStart.latitude]),location,{units:'kilometers'});ranked.push({...r,distanceKm:km,representativePoint:location.geometry.coordinates});}catch{excluded.push({id:r.id,fieldName:r.field.name,reason:'Parsel sınırı bulunamadı veya geçersiz; mesafe hesaplanamadı.'});}}
 ranked.sort((a,b)=>a.distanceKm-b.distanceKm||a.id.localeCompare(b.id));
 return {origin:planningStart,method:'CENTER_AERIAL_ASC_V1',distanceType:'STRAIGHT_LINE',rows:ranked.map((r,i)=>({...r,sequence:i+1})),excluded};
}
